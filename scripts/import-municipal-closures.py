"""Georeference Aalborg Kommune's proposed side-street closures on Mølholmsvej/Annebergvej.

The municipality publishes the closures only as red bars on a coordinate-less image
("Forslag til ny udformning af Mølholmsvej og Annebergvej", 2000 x 363 px). This script
holds the bars' pixel endpoints, measured from that image, and positions them with an
affine fit to four signalised junctions taken from OpenStreetMap street geometry.
Each bar must cross the side street recorded from visual review, otherwise it fails.

DAWA (api.dataforsyningen.dk) closed on 1 October 2026 and returns 410 Gone, so street
names come from OpenStreetMap, served as OpenMapTiles vector tiles by OpenFreeMap.

Requires Python 3.10+, shapely==2.1.2, pyproj and mapbox-vector-tile.
Run: python scripts/import-municipal-closures.py
Use --cache-dir <directory> --offline to rebuild from previously downloaded tiles.
"""
import argparse
import gzip
import json
import math
from datetime import date
from pathlib import Path
from urllib.request import Request, urlopen

import mapbox_vector_tile
from pyproj import Transformer
from shapely.geometry import LineString, Point, shape
from shapely.ops import nearest_points, unary_union

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'src' / 'data' / 'municipal-road-closures.geojson'
SOURCE_URL = 'https://www.aalborg.dk/om-kommunen/udvikling-og-projekter/udvikling-af-kommunen/3-limfjordsforbindelse/'
TILEJSON = 'https://tiles.openfreemap.org/planet'
ZOOM = 14
BBOX = (9.855, 9.925, 57.030, 57.058)  # west, east, south, north
IMAGE_SIZE = (2000, 363)
CORRIDOR = ('Mølholmsvej', 'Annebergvej')
MAX_CONTROL_RESIDUAL_M = 8
MAX_SIDE_STREET_DISTANCE_M = 12
# The published bars run along the redesigned road edge, so drawn as-is they sit on today's
# main-road casing and read as closing the main road. Draw each closure across the side
# street instead, this far from the corridor centreline, with the published bar's length.
SET_BACK_M = 18

# Junction centres in the image, matched to the junction of the named street with the corridor.
CONTROL_POINTS = {
    'Svalegårdsvej': (360, 200),
    'Skydebanevej': (940, 65),
    'Vestre Kærvej': (1395, 135),
    'Vestre Fjordvej': (1920, 222),
}


def unnamed(da, en):
    return {'street': None, 'description': {'da': da, 'en': en}}


# West to east. Pixel endpoints are the principal axis of each red bar's pixels.
# `street` is the OSM name the bar must cross; None means the crossed way has no name in OSM.
BARS = [
    ('lovstikkevej', 'Mølholmsvej', 'south', ((25.8, 348.5), (39.0, 344.0)), {'street': 'Løvstikkevej'}),
    ('lindskovvej', 'Mølholmsvej', 'south', ((196.2, 269.5), (217.0, 261.9)), {'street': 'Lindskovvej'}),
    ('norden', 'Mølholmsvej', 'north', ((236.0, 233.1), (262.0, 224.1)), {'street': 'Norden'}),
    ('adgangsvej-oest-for-norden', 'Mølholmsvej', 'north', ((269.5, 221.0), (282.5, 217.0)), unnamed(
        'Unavngiven adgangsvej øst for Norden', 'Unnamed access road east of Norden')),
    ('molholmsvej-nordvestlige-gren', 'Mølholmsvej', 'north', ((310.0, 207.1), (323.1, 202.4)), {
        'street': 'Mølholmsvej',
        'description': {'da': 'Mølholmsvejs nordvestlige gren, lige vest for Svalegårdsvej',
                        'en': 'The north-western branch of Mølholmsvej, just west of Svalegårdsvej'}}),
    ('johannesmindevej', 'Mølholmsvej', 'south', ((865.8, 99.5), (879.3, 95.0)), {'street': 'Johannesmindevej'}),
    ('vesterkaeret', 'Annebergvej', 'south', ((982.0, 80.0), (996.1, 82.4)), {'street': 'Vesterkæret'}),
    ('adgang-vest-for-boligbebyggelse', 'Annebergvej', 'south', ((1238.9, 124.4), (1253.1, 126.5)), unnamed(
        'Unavngiven adgang vest for boligbebyggelsen', 'Unnamed access west of the housing estate')),
    ('adgang-oest-for-boligbebyggelse', 'Annebergvej', 'south', ((1325.0, 139.9), (1339.1, 142.2)), unnamed(
        'Unavngiven adgang øst for boligbebyggelsen', 'Unnamed access east of the housing estate')),
    ('markvej-ved-boldbanerne', 'Annebergvej', 'north', ((1699.8, 177.2), (1713.0, 179.3)), unnamed(
        'Unavngiven markvej mellem boldbanerne', 'Unnamed track between the sports pitches')),
]

TO_UTM = Transformer.from_crs(4326, 25832, always_xy=True)
TO_WGS = Transformer.from_crs(25832, 4326, always_xy=True)


def fetch(url):
    request = Request(url, headers={'User-Agent': 'tredjekort-import/1.0'})
    with urlopen(request, timeout=60) as response:
        return response.read()


def tile_range():
    n = 2 ** ZOOM

    def tile(lon, lat):
        return int((lon + 180) / 360 * n), int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)

    (x0, y1), (x1, y0) = tile(BBOX[0], BBOX[2]), tile(BBOX[1], BBOX[3])
    return [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]


def load_tiles(cache_dir, offline):
    cache_dir.mkdir(parents=True, exist_ok=True)
    tilejson_path = cache_dir / 'tilejson.json'
    if not offline:
        tilejson_path.write_bytes(fetch(TILEJSON))
    template = json.loads(tilejson_path.read_text())['tiles'][0]
    tiles = []
    for x, y in tile_range():
        path = cache_dir / f'{ZOOM}-{x}-{y}.pbf'
        if not offline:
            path.write_bytes(fetch(template.format(z=ZOOM, x=x, y=y)))
        raw = path.read_bytes()
        tiles.append((x, y, gzip.decompress(raw) if raw[:2] == b'\x1f\x8b' else raw))
    return template, tiles


def utm_lines(x, y, extent, geometry):
    n = 2 ** ZOOM

    def convert(coordinate):
        lon = (x + coordinate[0] / extent) / n * 360 - 180
        lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + coordinate[1] / extent) / n))))
        return TO_UTM.transform(lon, lat)

    if geometry['type'] == 'LineString':
        parts = [geometry['coordinates']]
    elif geometry['type'] == 'MultiLineString':
        parts = geometry['coordinates']
    else:
        return []
    # OpenMapTiles merges equal-attribute ways per tile, so split them back into single lines.
    return [LineString([convert(c) for c in part]) for part in parts if len(part) > 1]


def read_ways(tiles):
    ways, names = [], []
    for x, y, raw in tiles:
        decoded = mapbox_vector_tile.decode(raw, default_options={'y_coord_down': True})
        for layer, target in (('transportation', ways), ('transportation_name', names)):
            if layer not in decoded:
                continue
            extent = decoded[layer]['extent']
            for feature in decoded[layer]['features']:
                for line in utm_lines(x, y, extent, feature['geometry']):
                    target.append((feature['properties'], line))
    return ways, names


def fit_affine(pixels, targets):
    # Least-squares affine transform: [px, py, 1] @ matrix = [easting, northing].
    rows = [[px, py, 1] for px, py in pixels]
    normal = [[sum(r[i] * r[j] for r in rows) for j in range(3)] for i in range(3)]
    matrix = []
    for axis in range(2):
        rhs = [sum(r[i] * t[axis] for r, t in zip(rows, targets)) for i in range(3)]
        matrix.append(solve3(normal, rhs))
    return lambda px, py: tuple(m[0] * px + m[1] * py + m[2] for m in matrix)


def solve3(a, b):
    def det(m):
        return (m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
                + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]))
    d = det(a)
    return [det([[b[r] if c == k else a[r][c] for c in range(3)] for r in range(3)]) / d for k in range(3)]


def street_name(point, names):
    # Looked up at the set-back point, clear of the junction, so the corridor's own name only
    # matches a branch that really carries it (the north-western arm of Mølholmsvej).
    best = min(((other.distance(point), props['name']) for props, other in names if props.get('name')), default=None)
    return best[1] if best and best[0] < 2 else None


def closure_across(way, crossing, corridor, length):
    # Walk along the side street away from the corridor, then draw a bar at right angles to it.
    # Only the through route near this crossing counts, not a distant bend of the same road.
    corridor = corridor.intersection(crossing.buffer(40))
    start = way.project(crossing)
    away = 1 if corridor.distance(way.interpolate(start + 5)) > corridor.distance(way.interpolate(start - 5)) else -1
    position = start
    for _ in range(60):
        if corridor.distance(way.interpolate(position)) >= SET_BACK_M:
            break
        position += away
    centre = way.interpolate(position)
    a, b = way.interpolate(position - 2).coords[0], way.interpolate(position + 2).coords[0]
    dx, dy = b[0] - a[0], b[1] - a[1]
    norm = math.hypot(dx, dy)
    nx, ny = -dy / norm * length / 2, dx / norm * length / 2
    return LineString([(centre.x - nx, centre.y - ny), (centre.x + nx, centre.y + ny)]), centre, corridor.distance(centre)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-dir', type=Path, default=ROOT / 'tmp' / 'municipal-closures')
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()

    template, tiles = load_tiles(args.cache_dir, args.offline)
    ways, names = read_ways(tiles)
    corridor = unary_union([line for props, line in names if props.get('name') in CORRIDOR])

    targets = []
    for street in CONTROL_POINTS:
        street_lines = unary_union([line for props, line in names if props.get('name') == street])
        targets.append(nearest_points(street_lines, corridor)[1].coords[0])
    to_utm = fit_affine(list(CONTROL_POINTS.values()), targets)
    residuals = {street: round(math.dist(to_utm(*px), target), 1) for (street, px), target in zip(CONTROL_POINTS.items(), targets)}
    if max(residuals.values()) > MAX_CONTROL_RESIDUAL_M:
        raise SystemExit(f'Control-point residuals too large: {residuals}')

    # The through route is the tertiary road carrying the corridor names; OSM also names a
    # minor north-western branch Mølholmsvej, which is one of the closed side streets.
    corridor_zone = corridor.buffer(5)
    through = unary_union([line for props, line in ways if props.get('class') == 'tertiary'
                           and line.intersection(corridor_zone).length > 0.8 * line.length])
    if through.length < 2500:
        raise SystemExit(f'Through route is only {through.length:.0f} m long')
    side_streets = [(props, line) for props, line in ways
                    if line.distance(through) < 30 and line.hausdorff_distance(through) > 25
                    and props.get('class') not in ('motorway', 'trunk', 'primary', 'secondary', 'tertiary')]
    features = []
    for index, (slug, road, side, endpoints, expected) in enumerate(BARS, 1):
        line = LineString([to_utm(*p) for p in endpoints])
        distance, props, crossed = min(((way.distance(line), p, way) for p, way in side_streets), key=lambda item: item[0])
        crossing = nearest_points(crossed, line)[0]
        drawn, centre, set_back = closure_across(crossed, crossing, through, line.length)
        street = street_name(centre, names)
        if distance > MAX_SIDE_STREET_DISTANCE_M or street != expected['street'] or abs(set_back - SET_BACK_M) > 2:
            raise SystemExit(f'Bar {slug} crosses {street!r} at {distance:.1f} m (set back {set_back:.1f} m), expected {expected["street"]!r}')
        properties = {
            'id': f'closure-{index:02d}-{slug}',
            'kind': 'closure-with-path-access',
            'street': street,
            'description': expected.get('description'),
            'corridorRoad': road,
            'side': side,
            'status': 'preliminary-proposal',
            'confidence': 'schematic',
            'crossedWayClass': props.get('class'),
            'sideStreetDistanceM': round(distance, 1),
            'setBackFromCorridorM': round(set_back, 1),
            'sourceImagePx': [list(p) for p in endpoints],
            'publishedBarCoordinates': [[round(v, 7) for v in TO_WGS.transform(*c)] for c in line.coords],
            'sourceUrl': SOURCE_URL,
            'reviewedAt': date.today().isoformat(),
        }
        coordinates = [[round(v, 7) for v in TO_WGS.transform(*c)] for c in drawn.coords]
        features.append({'type': 'Feature', 'properties': properties, 'geometry': {'type': 'LineString', 'coordinates': coordinates}})

    collection = {
        'type': 'FeatureCollection',
        'metadata': {
            'publisher': 'Aalborg Kommune',
            'title': {'da': 'Foreslåede vejlukninger med stiadgang', 'en': 'Proposed road closures with path access'},
            'sourceUrl': SOURCE_URL,
            'sourceCaption': 'Forslag til ny udformning af Mølholmsvej og Annebergvej. De røde streger markerer vejlukning med stiadgang.',
            'status': 'preliminary-proposal',
            'reviewedAt': date.today().isoformat(),
            'georeferencing': {
                'method': 'Least-squares affine fit of the image to four signalised junctions in OpenStreetMap; image measured at about 1 m per pixel.',
                'imageSizePx': list(IMAGE_SIZE),
                'controlPoints': [{'street': s, 'imagePx': list(px), 'residualM': residuals[s]} for s, px in CONTROL_POINTS.items()],
                'streetData': '© OpenStreetMap contributors (ODbL), OpenMapTiles schema via OpenFreeMap',
                'tileTemplate': template,
                'zoom': ZOOM,
            },
            'note': f'Positions are approximate. Each closure is drawn across its side street about {SET_BACK_M} m from the corridor centreline; publishedBarCoordinates keeps where the municipality drew the bar, along its redesigned road edge. Street names are from OpenStreetMap because DAWA closed on 1 October 2026.',
        },
        'features': features,
    }
    OUTPUT.write_text(json.dumps(collection, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {len(features)} closures to {OUTPUT.relative_to(ROOT)}; control residuals {residuals}')


if __name__ == '__main__':
    main()
