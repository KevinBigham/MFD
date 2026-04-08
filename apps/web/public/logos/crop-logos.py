#!/usr/bin/env python3
"""
Crop 2x2 composite team logo images into individual team logos.

Usage:
  python3 crop-logos.py

Expects 8 composite images in ./composites/ named by division.
Each composite is a 2x2 grid with background bleed between quadrants.
We crop inward (15% on each interior edge, 8% on outer edges) to
isolate each logo cleanly, then output at 512px wide preserving
the natural aspect ratio.
"""

from PIL import Image
import os

# Map: filename -> [(row, col, team_abbr), ...]
# Grid positions: (0,0)=top-left, (0,1)=top-right, (1,0)=bottom-left, (1,1)=bottom-right
COMPOSITES = {
    'AFC East.png': [
        (0, 0, 'nyc'),  # New York Concrete Jungle Cabbies
        (0, 1, 'bos'),  # Boston Hub of the Universe Chowderheads
        (1, 0, 'phi'),  # Philadelphia City of Brotherly Love Bell-Ringers
        (1, 1, 'bal'),  # Baltimore Charm City Crab Pickers
    ],
    'AFC North.png': [
        (0, 0, 'pit'),  # Pittsburgh Steel City Iron Smelters
        (0, 1, 'cle'),  # Cleveland Forest City Rockers
        (1, 0, 'cin'),  # Cincinnati Porkopolis Flying Pigs
        (1, 1, 'col'),  # Columbus Cowtown Astronauts
    ],
    'AFC South.png': [
        (0, 0, 'hou'),  # Houston Brisket Spaceships
        (0, 1, 'dal'),  # Dallas Pegasus Rodeos
        (1, 0, 'sa'),   # San Antonio Puroville Rivers
        (1, 1, 'nsh'),  # Nashville Buckle of the Bible Belt
    ],
    'AFC West.png': [
        (0, 0, 'kc'),   # Kansas City BBQ Fountains
        (0, 1, 'den'),  # Denver Wall Street of the West
        (1, 0, 'lv'),   # Las Vegas Sin City Cardsharks
        (1, 1, 'phx'),  # Phoenix Valley of the Sun Grand Canyons
    ],
    'NFC East.png': [
        (0, 0, 'dc'),   # Washington Bi-Partisan Filibusters
        (0, 1, 'clt'),  # Charlotte Queen City Bootleggers
        (1, 0, 'atl'),  # Atlanta Empire City of the South Peaches
        (1, 1, 'mia'),  # Miami Sunny Place for Shady People
    ],
    'NFC North.png': [
        (0, 0, 'chi'),  # Chicago City of Broad Shoulders Deep-Dish
        (0, 1, 'det'),  # Detroit Motown Music Machine
        (1, 0, 'min'),  # Minneapolis Juicy-Lucy Lakers
        (1, 1, 'stl'),  # St. Louis Gateway to the West Toasted Raviolis
    ],
    'NFC South.png': [
        (0, 0, 'tb'),   # Tampa Bay The Big Guava Pirates
        (0, 1, 'orl'),  # Orlando Theme Park Capital Rollercoasters
        (1, 0, 'jax'),  # Jacksonville Bold New City Swamps
        (1, 1, 'ind'),  # Indianapolis Nap Town Speed Racers
    ],
    'NFC West.png': [
        (0, 0, 'la'),   # Los Angeles La-La Land Traffic Jams
        (0, 1, 'sf'),   # San Francisco City by the Bay Sourdoughs
        (1, 0, 'sea'),  # Seattle Emerald City Grunge
        (1, 1, 'sd'),   # San Diego America's Finest City Surfers
    ],
}

OUTPUT_WIDTH = 512  # Output width in pixels (height derived from aspect ratio)

# How much to trim from interior edges (where logos bleed into each other)
INTERIOR_TRIM = 0.20  # 20% of quadrant dimension
# How much to trim from exterior edges (outer border of composite)
EXTERIOR_TRIM = 0.05  # 5% of quadrant dimension

script_dir = os.path.dirname(os.path.abspath(__file__))
composites_dir = os.path.join(script_dir, 'composites')

processed = 0
for filename, teams in COMPOSITES.items():
    path = os.path.join(composites_dir, filename)
    if not os.path.exists(path):
        print(f'  SKIP {filename} (not found)')
        continue

    img = Image.open(path)
    w, h = img.size
    half_w, half_h = w // 2, h // 2

    for row, col, abbr in teams:
        # Start with the raw quadrant boundaries
        left = col * half_w
        top = row * half_h
        right = left + half_w
        bottom = top + half_h

        # Trim edges: interior edges get more trim (bleed), exterior edges get less
        # Left edge
        if col == 0:
            left += int(half_w * EXTERIOR_TRIM)   # outer left
        else:
            left += int(half_w * INTERIOR_TRIM)    # interior left

        # Right edge
        if col == 1:
            right -= int(half_w * EXTERIOR_TRIM)   # outer right
        else:
            right -= int(half_w * INTERIOR_TRIM)    # interior right

        # Top edge
        if row == 0:
            top += int(half_h * EXTERIOR_TRIM)     # outer top
        else:
            top += int(half_h * INTERIOR_TRIM)      # interior top

        # Bottom edge
        if row == 1:
            bottom -= int(half_h * EXTERIOR_TRIM)  # outer bottom
        else:
            bottom -= int(half_h * INTERIOR_TRIM)   # interior bottom

        crop = img.crop((left, top, right, bottom))

        # Scale to OUTPUT_WIDTH, preserving aspect ratio
        aspect = crop.height / crop.width
        out_h = int(OUTPUT_WIDTH * aspect)
        crop = crop.resize((OUTPUT_WIDTH, out_h), Image.LANCZOS)

        out_path = os.path.join(script_dir, f'{abbr}.png')
        crop.save(out_path, 'PNG')
        processed += 1
        print(f'  OK {abbr}.png ({OUTPUT_WIDTH}x{out_h})')

print(f'\nDone: {processed}/32 logos cropped.')
