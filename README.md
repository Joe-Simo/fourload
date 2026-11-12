# Fourload

Plan Snapmaker U1 print jobs that fit four toolheads.

Fourload is a browser app for colour layout and print-job planning on the Snapmaker U1. You can open a 3MF, open a JSON plan, load a sample, or add parts by hand. The planner previews each job on the official 270 mm bed, assigns colours to T0 through T3, and splits a plate into the fewest U1 jobs when it uses more than four colours. It also checks materials and optional temperatures, speed, acceleration, and flow against official Snapmaker lists and maxima.

This is a planning aid, not a slicer. It has not been validated on a physical Snapmaker U1. It is an independent project and is not affiliated with Snapmaker.

Live demo: https://fourload.vercel.app/ (try `?sample=six&job=1`, `?sample=six&job=2`, `?sample=four`, `?sample=limits`).

## What it does

- Previews a multi-part plate on a 270 mm × 270 mm bed, and checks height against 270 mm, using the official U1 build volume.
- Assigns up to four colours to toolhead slots T0 through T3.
- When a plate uses more than four colours, splits parts into separate print jobs so that each job's colour union still fits four toolheads. Print those jobs as separate plates. Fourload does not claim the U1 can swap spools mid-print, and it does not auto-merge colours.
- Blocks a single part that itself uses more than four colours, or that is larger than the official volume in a way rotation cannot fix.
- Checks materials against the official compatibility lists (basic; optional top cover; top cover plus hardened steel nozzle). Unknown names are flagged, not guessed. Official lists are by enclosure and nozzle, not by material pair, so mixed materials get a note rather than a pair-print claim.
- If you type optional settings, flags values above the official maxima: 300°C nozzle, 100°C bed, 500 mm/s, 20,000 mm/s², 32 mm³/s.
- Exports a JSON plan and a markdown loadout card with the same citations.

## Official specifications used

Read on 12 November 2026 from the pages below. If a number is not on those pages, it is not treated as a U1 fact.

From the [official U1 specifications](https://www.snapmaker.com/snapmaker-u1/specs):

- Toolheads included: 4
- Build volume: 270 mm × 270 mm × 270 mm
- Max toolhead speed: 500 mm/s
- Max acceleration: 20,000 mm/s²
- Max flow for hot end: 32 mm³/s (the specifications page marks this figure with a footnote marker; the notes list is published on the product page, so Fourload cites the number and the specifications URL only)
- Nozzle: stainless steel, 0.4 mm
- Filament diameter: 1.75 mm
- Max nozzle temperature: 300°C
- Max heated bed temperature: 100°C
- Basic material compatibility: PLA, PETG, TPU, PVA, PCTG
- With optional top cover: PLA, PETG, TPU, PVA, PET, ABS, ASA, PA, PC
- With top cover and hardened steel nozzle: the top-cover list, plus "Carbon-fiber-reinforced Polymer" and "Glass-fiber-reinforced Polymer"

From the [official U1 FAQ summary](https://forum.snapmaker.com/t/u1-faq-official-info-summary/39648):

- "The actual usable bed size is 270mm*270mm."
- The U1 ships with 4 × 0.4 mm proprietary stainless hotends, plus one spare hotend.

From the [official U1 product page](https://www.snapmaker.com/snapmaker-u1), shown as published reference only, not as a Fourload measurement:

- "Four independent, preheated toolheads let U1 switch colors and materials in just 5 seconds [1]." Footnote [1]: "This is a typical result from Snapmaker Lab tests and is for reference only."
- Footnote [2] states that a prime or wiping tower is still produced during a colour change, and is not what Snapmaker defines as purging for colour change. Fourload does not estimate tower mass or size.

A carbon-fiber or glass-fiber style name such as "PA-CF" is treated as the official "Carbon-fiber-reinforced Polymer" or "Glass-fiber-reinforced Polymer" category by a name-matching rule that Fourload discloses in the warning. That rule is not an official synonym table.

## Run it locally

Needs Node.js 20 or later.

```bash
npm install
npm test
npm run dev
```

Then open http://localhost:3000. For a static folder you can host anywhere:

```bash
npm run build
```

The static site is written to `out/`.

## Tests

`npm test` covers official spec constants, colour handling, material classification, limit checks, bed fit, packing, job splitting, markdown export, and 3MF import (size, translation, colour, and inch-to-millimetre conversion).

## Limits, stated up front

- Bounding boxes are axis-aligned. A 3MF item with a rotation (not a plain translation) keeps its unrotated mesh size, and the importer says so.
- Packing uses part rectangles and a user-set layout gap. The gap is a planner spacing, not an official clearance.
- Fourload does not invent print time or filament mass.
- Painted 3MF triangle colours are collected when the file names them. If a file has no colour, assign one in the editor before planning.
- Open source under the MIT License.

## AI use

This project was built with AI coding assistance. Every U1 specification is taken from the cited official Snapmaker pages. No specification was invented. The job-split and packing logic is original to this repository and is covered by tests.
