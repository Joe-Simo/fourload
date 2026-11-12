# Fourload: plan U1 print jobs that fit four toolheads

Use this file to fill the embedded Phase 2 template. Do not post it until a public demo URL is live. Leave the username and Project URL fields for the forum account and the deploy host.

Suggested topic title: Fourload: plan U1 print jobs that fit four toolheads

Tags: Cash Fund, App

Cover image: attach submission/fourload-cover.png

---

### I have read and understood all rules of the Innovation Fund Phase 2

on

### I consent to my project information (username, project cover, summary, etc.) being publicly displayed for review and showcase

on

### Username (for public display)

[paste the Snapmaker Forum username after signup]

### Project name

Fourload

### Project URL

https://fourload.vercel.app/

Until that URL exists, the app can be built from the project folder with `npm install`, `npm test`, and `npm run dev` or `npm run build` (static files go to `out/`).

### Project cover

Attach `submission/fourload-cover.png` (Six-colour tabletop set, Job 1 of 2, on the official 270 mm bed).

### Project Category

App

### Project Summary

Fourload is a browser app that plans Snapmaker U1 print jobs around four toolheads. You can drop a 3MF, open a JSON plan, load a sample, or add parts by hand. It previews each job on the official 270 mm × 270 mm bed, assigns colours to T0 through T3, and splits a plate into the fewest U1 jobs when the plate uses more than four colours. It also checks materials and optional temperatures, speed, acceleration, and flow against official Snapmaker lists and maxima.

Why this exists. The U1 loads four toolheads. A downloaded or home-built plate often uses more than four colours, and the usual advice is to merge the closest colours. Sometimes you do not want to merge them. Fourload answers a different question: how do you split that plate into separate U1 jobs so that each job still fits four slots, and does each job fit the official build volume and material lists? Print those jobs as separate plates. Fourload does not claim the printer can swap spools mid-print, and it does not auto-merge colours.

What you can try right now, with no printer:

1. Open the live demo (or run it locally) and load "Sample: six colours, two jobs". Job 1 holds the board and three pawns (four colours). Job 2 holds the white and black tokens. Each job fits the official 270 mm volume.
2. Load "Sample: four colours, one job" to see a plate that stays in a single loadout.
3. Load "Sample: limits and material checks" to see blocked parts (a 300 mm panel, and a five-colour part) and warnings for official maxima and material lists (ABS is listed only with the optional top cover; a PA-CF style name is flagged with a disclosed matching rule; an unlisted name is not guessed).
4. Export the markdown loadout card. It repeats the same citations.

How it is built. The planner is TypeScript and Next.js, with a static export you can host on a free tier. `npm test` currently runs 28 tests covering official spec constants, colour handling, material classification, limit checks, bed fit, packing, job splitting, markdown export, and 3MF import (size, translation, colour, and inch-to-millimetre conversion). The code is MIT licensed.

Technical details judges may want:

- Job split: parts are partitioned into the fewest groups whose colour union is at most four, using an exact search pruned by a first-fit bound, then packed as axis-aligned boxes onto the official 270 mm bed. A user-set layout gap is a planner spacing, not an official clearance.
- A single part that itself uses more than four colours is blocked. Reducing colours is left to the user, on purpose. U1 Palette Fit (topic 44138) already covers merging a palette into four slots by colour distance. Fourload does not try to replace that tool.
- 3MF import reads mesh size, a translation-only transform, and basematerial colours. If a transform is not a plain translation, the importer says so and does not pretend to apply the rotation to the bounding box.
- Every U1 number comes from official pages read on 12 November 2026. Specifications: https://www.snapmaker.com/snapmaker-u1/specs (four toolheads, 270 mm build volume, 0.4 mm nozzle, 1.75 mm filament, 300°C nozzle max, 100°C bed max, 500 mm/s, 20,000 mm/s², 32 mm³/s max flow, and the published material lists). Official FAQ: https://forum.snapmaker.com/t/u1-faq-official-info-summary/39648 (usable bed 270 mm × 270 mm, and four 0.4 mm stainless hotends plus a spare). Product page: https://www.snapmaker.com/snapmaker-u1 (the published 5-second SnapSwap figure is footnoted as a typical Snapmaker Lab result, for reference only; Fourload does not treat it as a measured job time, and it does not estimate prime-tower mass).
- Fourload does not invent print time or filament mass. Official compatibility is listed by enclosure and nozzle, not by material pair, so mixed materials get a note rather than a pair-print claim.

Limits, stated up front. This entry has not been validated on a physical Snapmaker U1. I do not own a U1, and I am not asking the fund for hardware. The official completeness criterion mentions physical U1 validation. I am submitting to the Cash Fund because the FAQ says "You don't need a U1 in hand to submit," the app is a finished, tryable demo rather than an idea-stage sketch, and Kromacut's Phase 2 post is also Cash Fund without a U1 on hand. U1 owners can try Fourload on their own 3MF files and say what they find. If something in a real file is wrong, I will fix it and record it here.

This project was built with AI coding assistance. Every U1 specification is taken from the cited official Snapmaker pages. No specification was invented. The job-split and packing logic is original to this project and is covered by tests.

Fourload is an independent project and is not affiliated with Snapmaker. Screenshots and a longer walk-through are in the first reply, as the Read First topic asks.

### Open Source Status

Open Source

### Please specify the open source license used by this project

MIT

### Cash Fund or U1 Hardware Sponsorship

Cash Fund

### Originality

Original New Idea

### If based on an existing project  -  your independent contribution

Not based on an existing project. Next.js, React, and JSZip are dependencies only. The job-split, packing, official-limit checks, 3MF reader, and planner UI are new work.

### Is it a paid project?

No
