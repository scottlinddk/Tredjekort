"""Import public Vejdirektoratet WFS snapshots without inventing geometry.

Requires Python 3.10+ and shapely==2.1.2 (only for import/display validation).
Run: python scripts/import-official-data.py
Use --cache-dir tmp/pdfs --offline to reproduce from previously downloaded raw files.
Use --points-only to refresh only the verified address/facade-noise snapshot.
The API snapshot retains every source coordinate; only the browser copy is simplified.
"""
import argparse
import gzip
import hashlib
import json
import math
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

from shapely import make_valid
from shapely.affinity import scale
from shapely.geometry import mapping, shape
from shapely.validation import explain_validity

ROOT = Path(__file__).resolve().parents[1]
SERVICE = 'https://geocloud.vd.dk/geo/vvm/ows'
PAGE = 'https://www.vejdirektoratet.dk/vvm/limfjorden/miljoe/stoej'
LAYERS = {
    'noise': 'vvm_analysedata_e9095_stoej_polygon',
    'alignment': 'vvm_e9095_analysedata_linje_projekt_fase_3',
    'land': 'vvm_e9095_analysedata_polygon_areal_fase_3',
    'noise-points': 'stoej_punkt_9095',
}
SCENARIOS = [
    {'id': 'original', 'sourceValue': 'Forslag 1', 'label': {'da': 'Med projekt · oprindeligt forslag', 'en': 'With project · original design'}},
    {'id': 'reference', 'sourceValue': 'Forslag x', 'label': {'da': 'Uden projekt · reference', 'en': 'Without project · reference'}},
    {'id': 'variant', 'sourceValue': 'Forslag 3', 'label': {'da': 'Med projekt · variant', 'en': 'With project · variant design'}},
]
SCENARIO_IDS = {s['sourceValue']: s['id'] for s in SCENARIOS}
BANDS = {
    '53 - 58 dB': (53, 58, '#99ff00'),
    '58 - 63 dB': (58, 63, '#ffff00'),
    '63 - 68 dB': (63, 68, '#ff9900'),
    '68 - 73 dB': (68, 73, '#ff3300'),
    '73 - 78 dB': (73, 78, '#9933cc'),
    # Preserve the published label: the source does not specify an upper bound.
    # The source WMS style omits this category; this app supplies a display color.
    '78 dB': (78, None, '#6b238e'),
}


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8')


def write_json(path, value, pretty=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    if pretty:
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    else:
        path.write_bytes(encode(value))


def coordinates(value):
    if isinstance(value[0], (int, float)):
        yield value
    else:
        for item in value:
            yield from coordinates(item)


def checked_geometry(geometry):
    points = list(coordinates(geometry['coordinates']))
    if any(not all(math.isfinite(v) for v in p) or not (9 < p[0] < 11 and 56 < p[1] < 58) for p in points):
        raise ValueError('Unexpected coordinate order or project extent')
    return [min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points), max(p[1] for p in points)]


def load_layer(key, cache, offline):
    params = {'service': 'WFS', 'version': '2.0.0', 'request': 'GetFeature',
              'typeNames': 'vvm:' + LAYERS[key], 'outputFormat': 'application/json',
              'srsName': 'CRS:84', 'count': 10000}
    url = SERVICE + '?' + urlencode(params)
    path = cache / ('official-' + key + '-raw.geojson')
    if not offline:
        with urlopen(url, timeout=120) as response:
            path.write_bytes(response.read())
    raw = path.read_bytes()
    data = json.loads(raw)
    count = len(data.get('features', []))
    if data.get('type') != 'FeatureCollection' or not count:
        raise ValueError(f'{key}: no GeoJSON features received')
    if count != data.get('numberReturned') or count != data.get('numberMatched'):
        raise ValueError(f'{key}: incomplete WFS response; add pagination before importing')
    if len({f['id'] for f in data['features']}) != count:
        raise ValueError(f'{key}: duplicate source feature identifiers')
    return data, {'layer': LAYERS[key], 'serviceUrl': url, 'numberMatched': count,
                  'numberReturned': count, 'rawSha256': hashlib.sha256(raw).hexdigest(),
                  'retrievedAt': data.get('timeStamp'), 'crs': 'OGC:CRS84',
                  'coordinateOrder': ['longitude', 'latitude']}


def display_geometry(geometry):
    original = shape(geometry)
    repaired = not original.is_valid
    if repaired:
        original = make_valid(original)
    # Local affine metre approximation at 57°N. This applies only to display;
    # original WFS coordinates remain byte-for-value unchanged in the API file.
    projected = scale(original, xfact=60500, yfact=111200, origin=(0, 0))
    simplified = projected.simplify(1, preserve_topology=True)
    result = scale(simplified, xfact=1 / 60500, yfact=1 / 111200, origin=(0, 0))
    if not result.is_valid or result.is_empty:
        raise ValueError('Display simplification produced invalid/empty geometry')
    # Six decimals is not necessary: retaining eight avoids altering tiny rings.
    return mapping(result), repaired


def invalid_components(geometry):
    component_type = {'MultiPolygon': 'Polygon', 'MultiLineString': 'LineString'}[geometry['type']]
    issues = []
    for index, coords in enumerate(geometry['coordinates']):
        component = {'type': component_type, 'coordinates': coords}
        parsed = shape(component)
        if not parsed.is_valid:
            issues.append({'index': index, 'bbox': checked_geometry(component), 'reason': explain_validity(parsed)})
    return issues


def import_noise_points(cache, offline, reviewed):
    """Import facade results only after identifying all scenarios against report tables."""
    data, source = load_layer('noise-points', cache, offline)
    scenario_fields = {'reference': 'lden_sce01', 'original': 'lden_sce02', 'variant': 'lden_sce03'}
    # Exact published fingerprints: report tables 5-7, 5-9 and 5-10 respectively.
    # Refuse an updated/different source model rather than silently relabelling it.
    expected = {'reference': [346, 218, 38, 8], 'original': [538, 83, 28, 2], 'variant': [539, 77, 28, 2]}
    bins = [(58, 63), (63, 68), (68, 73), (73, float('inf'))]
    fingerprints, zero_counts = {}, {}
    for scenario, field in scenario_fields.items():
        values = [f['properties'][field] for f in data['features']]
        if any(not isinstance(v, (int, float)) or not math.isfinite(v) or v < 0 or v > 150 for v in values):
            raise ValueError('Unexpected facade noise value in ' + field)
        fingerprint = [sum(low <= value < high for value in values) for low, high in bins]
        if fingerprint != expected[scenario]:
            raise ValueError(f'Noise-point scenario fingerprint changed: {scenario}: {fingerprint}; verify its model before importing')
        fingerprints[scenario] = {'sourceField': field, 'binCounts': fingerprint, 'above58Db': sum(v > 58 for v in values)}
        zero_counts[scenario] = sum(value == 0 for value in values)
    records = set()
    features = []
    address_positions = {}
    for item in data['features']:
        props = item['properties']
        record_id = props['id']
        if not isinstance(record_id, int) or record_id in records:
            raise ValueError('Facade records must have unique stable integer IDs')
        records.add(record_id)
        if item['geometry']['type'] != 'Point':
            raise ValueError('Facade data contains a non-point feature')
        bbox = checked_geometry(item['geometry'])
        road = str(props['vej_kode']).zfill(4)
        house = str(props['hus_nr']).strip().upper()
        raw_values = {scenario: props[field] for scenario, field in scenario_fields.items()}
        # Zero exists in the source, but its meaning is undocumented. Never show
        # it as measured silence or use it when calculating a scenario difference.
        values = {key: value if value > 0 else None for key, value in raw_values.items()}
        address_positions.setdefault((road, house), set()).add(tuple(item['geometry']['coordinates']))
        features.append({'type': 'Feature', 'id': 'stoej_punkt_9095.' + str(record_id),
            'geometry': item['geometry'], 'bbox': bbox,
            'properties': {'sourceRecordId': record_id, 'sourceFeatureId': item['id'],
                'roadCode': road, 'houseNumber': house, 'sourceFloor': props['etage'],
                'sourceFloorCode': props['sp_etage'], 'sourceDoor': props['side_doernr'],
                'buildingUseCode': props['enh_anvend_kode'], 'valuesDb': values,
                'rawValuesDb': raw_values, 'rawSourceProperties': props}})
    if len(features) != 2641 or any(len(v) != 1 for v in address_positions.values()):
        raise ValueError('Facade source coverage/address-position structure changed; review before importing')
    features.sort(key=lambda f: f['properties']['sourceRecordId'])
    collection = {'type': 'FeatureCollection', 'features': features}
    payload = encode(collection)
    output = ROOT / 'src' / 'data'
    write_json(output / 'official-noise-points.geojson', collection)
    metadata = {**source, 'schemaVersion': 1, 'reviewedAt': reviewed,
        'file': 'src/data/official-noise-points.geojson', 'sha256': hashlib.sha256(payload).hexdigest(),
        'sourceUrl': PAGE, 'modelYear': 2021, 'forecastYear': 2040, 'sourceUpdatedAt': None,
        'sourceDateNote': 'The point service exposes no calculation/update timestamp. Model identification is verified against the 2021 report, not inferred from retrieval time.',
        'indicator': 'Lden', 'units': 'dB(A)', 'measurementType': 'modelled-facade-noise',
        'method': 'Nord2000 / SoundPLAN 8.1, four weather classes; facade results linked to dwelling records',
        'methodSourceUrl': 'https://api.vejdirektoratet.dk/sites/default/files/2021-02/Milj%C3%B8konsekvensrapport_Egholmlinjen.pdf',
        'methodSourcePrintedPages': [76, 77], 'scenarioSourcePrintedPages': [81, 88, 91],
        'scenarioSourcePdfPages': [84, 91, 94], 'scenarioSourceTables': ['5-7', '5-9', '5-10'],
        'scenarioFields': scenario_fields, 'scenarioVerification': fingerprints,
        'municipalityCode': '0851',
        'municipalityNote': 'Aalborg matching scope, not a field in the source. Require municipality plus road/house match and coordinate consistency; do not join road codes across Denmark.',
        'matching': {'keys': ['municipalityCode', 'roadCode', 'houseNumber'],
            'maximumCoordinateDistanceM': 50,
            'coordinateGuardPurpose': 'Additional consistency guard after exact address-key matching, never a nearest-address fallback.',
            'multipleUnits': 'Aggregate the minimum and maximum of all matched dwelling rows; do not choose a floor arbitrarily.',
            'floorSemantics': 'Source floor codes are retained without converting them to DAWA floor labels.',
            'zeroValuePolicy': 'Raw zero values are retained but normalized to null because their meaning is not documented.',
            'incompleteAddressPolicy': 'If any matched unit is missing a scenario value, do not present a partial range as complete.'},
        'counts': {'records': len(features), 'addresses': len(address_positions), 'zeroValuesByScenario': zero_counts},
        'roadScope': 'Motorway and selected crossing/nearby existing roads; not every road in the study area.',
        'limitations': [
            'Historical 2021 EIA design and 2040 traffic forecast, not measured noise or the current detailed design.',
            'These are facade/dwelling model results, not the 1.5-metre landscape contour values.',
            'The with-project result includes selected surrounding roads; no isolated new-motorway contribution is provided.',
            'A difference between scenarios is a change in modelled total noise, not the standalone noise level of the motorway.',
            'Source decimals describe model output, not measurement accuracy. Display sensible rounding and retain provenance.',
            'Current 2035 PDFs lack a verified geographic registration and are not converted into address values.'
        ]}
    write_json(output / 'official-noise-points-metadata.json', metadata, pretty=True)
    print(json.dumps({'noisePointRecords': len(features), 'addresses': len(address_positions), 'bytes': len(payload)}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-dir', type=Path, default=ROOT / 'tmp' / 'official-data')
    parser.add_argument('--offline', action='store_true')
    parser.add_argument('--points-only', action='store_true')
    args = parser.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)
    reviewed = date.today().isoformat()
    import_noise_points(args.cache_dir, args.offline, reviewed)
    if args.points_only:
        return
    noise, noise_source = load_layer('noise', args.cache_dir, args.offline)
    features, display, invalid_ids = [], [], []
    for item in noise['features']:
        props = item['properties']
        label = props['bemaerkning']
        if props['forslag'] not in SCENARIO_IDS:
            raise ValueError('Unrecognized noise scenario: ' + props['forslag'])
        if label is not None and label not in BANDS:
            raise ValueError('Unrecognized noise band: ' + label)
        valid = shape(item['geometry']).is_valid
        if not valid:
            invalid_ids.append(item['id'])
        band = BANDS.get(label, (None, None, None))
        normalized = {'type': 'Feature', 'id': item['id'],
            'bbox': checked_geometry(item['geometry']), 'geometry': item['geometry'],
            'properties': {'kind': 'noise-band' if label else 'study-area',
                'scenario': SCENARIO_IDS[props['forslag']], 'sourceScenario': props['forslag'],
                'bandLabel': label, 'minDb': band[0], 'maxDb': band[1], 'color': band[2],
                'forecastYear': 2040, 'modelYear': 2021, 'sourceFeatureId': item['id'],
                'sourceUpdatedAt': props['tidsstempel'], 'sourceFile': props['datakildefil'],
                'sourceGeometryValid': valid,
                'invalidGeometryComponents': invalid_components(item['geometry']) if not valid else []}}
        features.append(normalized)
        if label:
            geometry, repaired = display_geometry(item['geometry'])
            display.append({**normalized, 'geometry': geometry,
                'properties': {**normalized['properties'], 'displayGeometryRepaired': repaired}})
    api_collection = {'type': 'FeatureCollection', 'features': features}
    api_bytes = encode(api_collection)
    output = ROOT / 'src' / 'data'
    output.mkdir(parents=True, exist_ok=True)
    (output / 'official-noise.geojson.gz').write_bytes(gzip.compress(api_bytes, compresslevel=9, mtime=0))
    # This large static file is fetched only when the layer is shown, never imported into JS.
    write_json(ROOT / 'public' / 'data' / 'official-noise-display.geojson', {'type': 'FeatureCollection', 'features': display})
    noise_metadata = {**noise_source, 'title': {'da': 'Officiel støj · VVM 2021, trafik 2040', 'en': 'Official noise · EIA 2021, traffic 2040'},
        'sourceUrl': PAGE, 'forecastYear': 2040, 'modelYear': 2021,
        'sourceUpdatedAt': '2021-02-11', 'sourcePageUpdatedAt': '2023-11-24', 'reviewedAt': reviewed,
        'units': 'dB(A)', 'indicator': 'Lden', 'scenarios': SCENARIOS,
        'method': 'Nord2000 / SoundPLAN 8.1, four weather classes',
        'measurementHeightM': 1.5, 'calculationGridM': [10, 10],
        'roadScope': 'Motorway and selected crossing/nearby existing roads; not every road in the study area.',
        'methodSourceUrl': 'https://api.vejdirektoratet.dk/sites/default/files/2021-02/Milj%C3%B8konsekvensrapport_Egholmlinjen.pdf',
        'methodSourcePages': [76, 77],
        'counts': {'sourceFeatures': len(features), 'noiseBands': len(display),
            'studyAreas': len(features) - len(display),
            'bandsByScenario': dict(Counter(f['properties']['scenario'] for f in display))},
        'coverage': {'kind': 'source-study-area', 'scenario': 'variant',
            'note': 'Two identical study-area features are retained with their original IDs and variant scenario. No absence of a noise band establishes a quiet address or a below-threshold level.'},
        'apiFile': 'src/data/official-noise.geojson.gz',
        'apiSha256': hashlib.sha256(api_bytes).hexdigest(), 'geometrySimplified': False,
        'sourceInvalidGeometryIds': invalid_ids,
        'displayFile': '/data/official-noise-display.geojson',
        'displaySimplification': {'toleranceMetresApprox': 1, 'preserveTopology': True,
            'method': 'Shapely 2.1.2; local affine metre approximation at 57N; invalid source rings repaired only for display'},
        'limitations': [
            'Historical 2021 EIA design and 2040 traffic forecast; not the latest 2035 detailed-design PDFs or measured noise.',
            'Bands represent modelled road-traffic noise in the scenario, not the isolated contribution of the new motorway.',
            'The model includes selected roads, not all roads; the report says it is intended for scenario comparison rather than a complete exposure assessment.',
            'The source top category is labelled 78 dB without a stated upper bound; preserve that label.',
            'The source contains two self-intersecting noise polygons, listed explicitly; original API geometries are retained.',
            'A point on a contour boundary can match adjacent bands; report ambiguity rather than a precise dB value.',
            'An address outside all returned bands has no mapped band; do not infer zero noise or a value below 53 dB.'
        ]}
    write_json(output / 'official-noise-metadata.json', noise_metadata, pretty=True)

    alignment, alignment_source = load_layer('alignment', args.cache_dir, args.offline)
    centerlines = [f for f in alignment['features'] if f['properties']['type'] == 'Vej centerlinje']
    if len(centerlines) != 1:
        raise ValueError('Unexpected official centerline feature count')
    line = centerlines[0]
    line_properties = line['properties']
    line_issues = invalid_components(line['geometry'])
    normalized_line = {'type': 'Feature', 'id': line['id'], 'bbox': checked_geometry(line['geometry']),
        'geometry': line['geometry'], 'properties': {'id': 'official-design-centerlines',
            'name': 'Officielle projektlinjer · fase 3 (2025)', 'kind': 'design-centerlines',
            'confidence': 'official-design-snapshot', 'sourceFeatureId': line['id'],
            'sourceUpdatedAt': line_properties['tidsstempel'], 'sourceFile': line_properties['datakildefil'],
            'sourceUrl': SERVICE, 'note': 'Includes project road centerlines, ramps and local details; not solely the motorway axis. A dated design snapshot, not a survey or the latest 2026 design.'}}
    normalized_line['properties'].update({'sourceGeometryValid': shape(line['geometry']).is_valid, 'invalidGeometryComponents': line_issues})
    write_json(output / 'official-alignment.geojson', {'type': 'FeatureCollection', 'features': [normalized_line]})
    alignment_meta = {**alignment_source, 'file': 'src/data/official-alignment.geojson',
        'retainedFeatures': 1, 'excludedType': 'Vej prj krop', 'lineSegments': len(line['geometry']['coordinates']),
        'sourceUpdatedAt': line_properties['tidsstempel'], 'bbox': normalized_line['bbox'],
        'geometrySimplified': False, 'invalidGeometryComponents': line_issues, 'note': normalized_line['properties']['note']}

    land, land_source = load_layer('land', args.cache_dir, args.offline)
    land_features = []
    for item in land['features']:
        props = item['properties']
        if 'permanent' in props['type']:
            kind = 'permanent'
        elif 'midlertidig' in props['type']:
            kind = 'temporary'
        else:
            raise ValueError('Unknown land-use category')
        component_issues = invalid_components(item['geometry'])
        land_features.append({'type': 'Feature', 'id': item['id'], 'bbox': checked_geometry(item['geometry']),
            'geometry': item['geometry'], 'properties': {'kind': kind, 'name': props['type'],
                'sourceFeatureId': item['id'], 'sourceUpdatedAt': props['tidsstempel'],
                'sourceFile': props['datakildefil'], 'sourceUrl': SERVICE,
                'sourceGeometryValid': shape(item['geometry']).is_valid, 'invalidGeometryComponents': component_issues,
                'note': 'Phase 3 design snapshot; not a cadastral parcel or a final expropriation decision.'}})
    write_json(output / 'official-land-requirements.geojson', {'type': 'FeatureCollection', 'features': land_features})
    land_meta = {**land_source, 'file': 'src/data/official-land-requirements.geojson',
        'sourceUpdatedAt': land_features[0]['properties']['sourceUpdatedAt'],
        'geometrySimplified': False, 'note': 'Permanent and temporary design land requirements, not cadastral boundaries or decisions about individual properties.'}
    write_json(output / 'official-spatial-data.json', {'schemaVersion': 1, 'reviewedAt': reviewed,
        'publisher': 'Vejdirektoratet', 'sourceUrl': 'https://geocloud.vd.dk/geo/vvm/ows?service=WFS&version=2.0.0&request=GetCapabilities',
        'noise': noise_metadata, 'alignment': alignment_meta, 'landRequirements': land_meta}, pretty=True)
    print(json.dumps({'noiseBands': len(display), 'apiGzipBytes': (output / 'official-noise.geojson.gz').stat().st_size,
        'displayBytes': (ROOT / 'public/data/official-noise-display.geojson').stat().st_size,
        'alignmentBytes': (output / 'official-alignment.geojson').stat().st_size,
        'landBytes': (output / 'official-land-requirements.geojson').stat().st_size}))


if __name__ == '__main__':
    main()
