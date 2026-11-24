#!/usr/bin/env python3
"""Build src/data/alternatives-2026-11.geojson from the official phase 3 axis.

Vejdirektoratet's "Foreløbig status for konsolidering" (24 November 2026) shows the
alternative "Ny linjeføring vest om slamdeponi" only as an annotated aerial image
(slide 8). No coordinates are published. This script makes the digitisation
reproducible instead of hand-placing points:

1. The current motorway axis is chained from the official 2025 phase 3 centerlines
   (src/data/official-alignment.geojson), from Ny Nibevej to Sønderdyb.
2. The alternative is that axis shifted to the west (left of the direction of travel)
   by a lateral offset read from slide 8. The slide is rotated (north to the right,
   west at the top); one pixel is about 3.25 m, calibrated on the distance between
   the Ny Nibevej and Nørholmsvej interchanges.
3. North of the alternative tunnel ramp the slide shows the alternative heading
   straight on (roughly NNW) while the current tunnel turns NNE. It is drawn only to
   the edge of the slide; where it would land on Egholm is not shown and not guessed.
4. The PFAS sludge deposit outline is read from the white outline on slide 8 with the
   same image-to-map transform.

Positional uncertainty is in the order of 100-150 m. Output is schematic.

Usage: python3 -I scripts/build-alternatives-2026-11.py
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ALIGNMENT = ROOT / 'src/data/official-alignment.geojson'
OUTPUT = ROOT / 'src/data/alternatives-2026-11.geojson'

SOURCE_URL = (
    'https://api.vejdirektoratet.dk/sites/default/files/2026-11/'
    'Forel%C3%B8big%20status%20for%20konsolidering%20den%2024.%20november%20vedr.%203.%20Limfjordsforbindelse.pdf'
)
REVIEWED_AT = '2026-11-24'

# Metres per degree at 57° N.
M_PER_DEG_LAT = 111_200.0
M_PER_DEG_LON = 60_600.0

# The current axis where it crosses the relocated Nørholmsvej (TSA 12). Chainage s = 0.
ORIGIN = (9.8486, 57.0376)

# Lateral offset to the west in metres against chainage s in metres (north positive),
# read from slide 8 at the pixel columns of Ny Nibevej, Seffendal Engsti, TSA 12 and the
# tunnel ramps. Zero south of about s = -2100 m, where both lines share the axis.
OFFSET_PROFILE = [
    (-2600, 0), (-2100, 0), (-1700, 40), (-1400, 90), (-1100, 130), (-700, 165),
    (-400, 185), (0, 205), (300, 190), (550, 170),
]
# Beyond the ramp the alternative continues straight on this bearing to the slide edge.
TUNNEL_BEARING_DEG = -12.0
TUNNEL_SHOWN_LENGTH_M = 600.0
# Tunnel ramps start at about the same chainage for both lines on slide 8.
RAMP_START_S = 300

# Slide 8 (1334 x 750 px render): image +x runs along the motorway, image -y is west.
# The TSA 12 crossing is at x = 930 px; one pixel is about 3.25 m.
IMAGE_ORIGIN_X_PX = 930
IMAGE_M_PER_PX = 3.25
# The alternative's centreline on the slide (x, y) in pixels, north of TSA 12.
ALTERNATIVE_LINE_PX = [(930, 312), (1000, 314), (1100, 322), (1200, 330), (1290, 340)]
# The deposit's white outline. Each corner is placed relative to the alternative line
# (along-line position and distance to the east of it), so the gap between the line and
# the deposit is kept as drawn even though the absolute position is uncertain.
DEPOSIT_OUTLINE_PX = [(975, 340), (1160, 345), (1165, 545), (1005, 545)]

# The current crossing of Sønderdyb along the official axis, from the south tunnel
# ramp to the Egholm side. North of 57.0415 the chained centerlines stop, so the axis
# is completed from the median of the official lines in 0.002° latitude bands.
AXIS_NORTH_OF_CHAIN = [
    (9.84770, 57.0430), (9.84765, 57.0450), (9.84782, 57.0470), (9.84820, 57.0490),
    (9.84913, 57.0510), (9.84993, 57.0530), (9.85137, 57.0550), (9.85279, 57.0570),
]


def to_metres(point):
    return ((point[0] - ORIGIN[0]) * M_PER_DEG_LON, (point[1] - ORIGIN[1]) * M_PER_DEG_LAT)


def to_lonlat(east, north):
    return [round(ORIGIN[0] + east / M_PER_DEG_LON, 7), round(ORIGIN[1] + north / M_PER_DEG_LAT, 7)]


def chain_axis(lines):
    """Follow the official motorway axis northwards from the segment south of Ny Nibevej."""
    starts = {}
    for index, line in enumerate(lines):
        starts.setdefault(tuple(line[0]), []).append(index)
    chain = [4496]
    current = tuple(lines[4496][-1])
    while True:
        candidates = [index for index in starts.get(current, []) if index not in chain]
        if not candidates:
            break
        following = min(candidates, key=lambda index: abs(index - chain[-1]))
        chain.append(following)
        current = tuple(lines[following][-1])
    points = [lines[chain[0]][0]] + [point for index in chain for point in lines[index][1:]]
    return points


def thin(points, spacing_m):
    kept = [points[0]]
    for point in points[1:]:
        e0, n0 = to_metres(kept[-1])
        e1, n1 = to_metres(point)
        if math.hypot(e1 - e0, n1 - n0) >= spacing_m:
            kept.append(point)
    if kept[-1] != points[-1]:
        kept.append(points[-1])
    return kept


def with_chainage(points):
    """Return (east, north, s) with s measured along the axis from the projection of ORIGIN."""
    metres = [to_metres(point) for point in points]
    cumulative = [0.0]
    for (e0, n0), (e1, n1) in zip(metres, metres[1:]):
        cumulative.append(cumulative[-1] + math.hypot(e1 - e0, n1 - n0))
    nearest = min(range(len(metres)), key=lambda i: math.hypot(*metres[i]))
    return [(e, n, s - cumulative[nearest]) for (e, n), s in zip(metres, cumulative)]


def interpolate(profile, s):
    if s <= profile[0][0]:
        return profile[0][1]
    for (s0, v0), (s1, v1) in zip(profile, profile[1:]):
        if s0 <= s <= s1:
            t = (s - s0) / (s1 - s0)
            # Smoothstep keeps the curve tangent to the axis at the tie-in.
            t = t * t * (3 - 2 * t)
            return v0 + (v1 - v0) * t
    return profile[-1][1]


def left_normal(points, index):
    previous = points[max(index - 1, 0)]
    following = points[min(index + 1, len(points) - 1)]
    de, dn = following[0] - previous[0], following[1] - previous[1]
    length = math.hypot(de, dn) or 1.0
    return (-dn / length, de / length)


def densify(points, spacing_m):
    dense = [points[0]]
    for a, b in zip(points, points[1:]):
        (e0, n0), (e1, n1) = to_metres(a), to_metres(b)
        steps = max(1, int(math.hypot(e1 - e0, n1 - n0) // spacing_m))
        for step in range(1, steps + 1):
            t = step / steps
            dense.append([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    return dense


def image_line_y(x):
    for (x0, y0), (x1, y1) in zip(ALTERNATIVE_LINE_PX, ALTERNATIVE_LINE_PX[1:]):
        if x0 <= x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    raise ValueError(f'x={x} px is outside the digitised alternative line')


def point_on_line(line_m, distance):
    """Point and right-hand normal at a distance along a metric polyline."""
    walked = 0.0
    for (e0, n0), (e1, n1) in zip(line_m, line_m[1:]):
        length = math.hypot(e1 - e0, n1 - n0)
        if walked + length >= distance or (e1, n1) == line_m[-1]:
            t = (distance - walked) / length
            de, dn = (e1 - e0) / length, (n1 - n0) / length
            return (e0 + de * length * t, n0 + dn * length * t), (dn, -de)
        walked += length
    raise ValueError('distance beyond line')


def main():
    lines = json.loads(ALIGNMENT.read_text())['features'][0]['geometry']['coordinates']
    axis = densify(thin(chain_axis(lines), 50) + [list(point) for point in AXIS_NORTH_OF_CHAIN], 25)
    axis_m = with_chainage(axis)
    axis_m = [point for point in axis_m if point[2] >= OFFSET_PROFILE[0][0]]

    land, ramp_and_tunnel = [], []
    portal_index = None
    for index, (east, north, s) in enumerate(axis_m):
        if s > OFFSET_PROFILE[-1][0]:
            break
        offset = interpolate(OFFSET_PROFILE, s)
        normal = left_normal(axis_m, index)
        point = to_lonlat(east + normal[0] * offset, north + normal[1] * offset)
        (land if s <= RAMP_START_S else ramp_and_tunnel).append(point)
        portal_index = index
    # Share the vertex where the land section hands over to the ramp.
    ramp_and_tunnel.insert(0, land[-1])
    end_e, end_n, _ = axis_m[portal_index]
    end_offset = OFFSET_PROFILE[-1][1]
    normal = left_normal(axis_m, portal_index)
    start_e, start_n = end_e + normal[0] * end_offset, end_n + normal[1] * end_offset
    bearing = math.radians(TUNNEL_BEARING_DEG)
    for step in range(1, 7):
        distance = TUNNEL_SHOWN_LENGTH_M * step / 6
        ramp_and_tunnel.append(to_lonlat(start_e + math.sin(bearing) * distance, start_n + math.cos(bearing) * distance))

    crossing = thin([to_lonlat(e, n) for e, n, s in axis_m if s >= RAMP_START_S], 50)

    # Deposit corners relative to the alternative line, measured from its TSA 12 vertex.
    alternative = land + ramp_and_tunnel[1:]
    alternative_m = [to_metres(point) for point in alternative]
    tsa12 = min(range(len(alternative_m)), key=lambda i: math.hypot(*alternative_m[i]))
    tsa12_distance = sum(
        math.hypot(e1 - e0, n1 - n0)
        for (e0, n0), (e1, n1) in zip(alternative_m[:tsa12], alternative_m[1:tsa12 + 1])
    )
    deposit = []
    for x, y in DEPOSIT_OUTLINE_PX:
        along = (x - IMAGE_ORIGIN_X_PX) * IMAGE_M_PER_PX
        east_of_line = (y - image_line_y(x)) * IMAGE_M_PER_PX
        (e, n), (re, rn) = point_on_line(alternative_m, tsa12_distance + along)
        deposit.append(to_lonlat(e + re * east_of_line, n + rn * east_of_line))
    deposit.append(deposit[0])
    land = thin(land, 40)

    common = {
        'status': 'preliminary-alternative',
        'confidence': 'schematic',
        'sourceUrl': SOURCE_URL,
        'sourcePage': 8,
        'reviewedAt': REVIEWED_AT,
    }
    collection = {
        'type': 'FeatureCollection',
        'metadata': {
            'publisher': 'Vejdirektoratet',
            'title': {
                'da': 'Foreløbig status for konsolidering · 3. Limfjordsforbindelse',
                'en': 'Preliminary consolidation status · 3rd Limfjord crossing',
            },
            'sourceUrl': SOURCE_URL,
            'sourceDate': '2026-11-24',
            'reviewedAt': REVIEWED_AT,
            'positionalUncertaintyM': 150,
            'method': (
                'Generated by scripts/build-alternatives-2026-11.py: the official 2025 phase 3 axis, '
                'offset to the west by a lateral profile read from slide 8. No coordinates are published.'
            ),
        },
        'features': [
            {
                'type': 'Feature',
                'properties': {
                    **common, 'id': 'west-of-deposit-land', 'kind': 'alternative-alignment', 'structure': 'road',
                    'name': {'da': 'Ny linjeføring vest om slamdeponi', 'en': 'New alignment west of the sludge deposit'},
                },
                'geometry': {'type': 'LineString', 'coordinates': land},
            },
            {
                'type': 'Feature',
                'properties': {
                    **common, 'id': 'west-of-deposit-tunnel', 'kind': 'alternative-alignment', 'structure': 'tunnel',
                    'name': {'da': 'Alternativ tunnelrampe og tunnel (vist til slidets kant)', 'en': 'Alternative tunnel ramp and tunnel (shown to the slide edge)'},
                    'note': 'The slide does not show where this alternative reaches Egholm. The line stops where the slide stops.',
                },
                'geometry': {'type': 'LineString', 'coordinates': ramp_and_tunnel},
            },
            {
                'type': 'Feature',
                'properties': {
                    **common, 'id': 'molholm-sludge-deposit', 'kind': 'pfas-deposit',
                    'name': {'da': 'Slamdeponi ved Mølholm (PFAS)', 'en': 'Mølholm sludge deposit (PFAS)'},
                    'sourcePage': 8,
                    'note': 'Outline read from the white boundary on slide 8; slide 2 reports large amounts of PFAS here.',
                },
                'geometry': {'type': 'Polygon', 'coordinates': [deposit]},
            },
            {
                'type': 'Feature',
                'properties': {
                    **common, 'id': 'sonderdyb-crossing', 'kind': 'fjord-crossing', 'sourcePage': 9,
                    'confidence': 'official-axis-approximate',
                    'name': {'da': 'Krydsning af Sønderdyb (nuværende placering)', 'en': 'Sønderdyb crossing (current position)'},
                    'note': 'The current immersed-tunnel section on the official axis. Slide 9 compares solutions for this crossing; it does not publish a separate alignment for each.',
                },
                'geometry': {'type': 'LineString', 'coordinates': crossing},
            },
        ],
    }
    OUTPUT.write_text(json.dumps(collection, ensure_ascii=False, indent=1) + '\n')
    print(f'wrote {OUTPUT.relative_to(ROOT)}: land {len(land)} pts, tunnel {len(ramp_and_tunnel)} pts, crossing {len(crossing)} pts')


if __name__ == '__main__':
    main()
