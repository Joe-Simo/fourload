import { SPECS_PAGE, U1 } from "./specs";
import type { Part, PlacedPart, Warning } from "./types";

export const BED_X = U1.buildVolumeMm[0];
export const BED_Y = U1.buildVolumeMm[1];
export const BED_Z = U1.buildVolumeMm[2];

export function partExceedsVolume(part: Part): Warning[] {
  const [x, y, z] = part.sizeMm;
  const warnings: Warning[] = [];
  const source = SPECS_PAGE;
  if (x > BED_X && y > BED_X) {
    warnings.push({
      level: "block",
      code: "part-too-wide",
      partId: part.id,
      source,
      message: `${part.name} is ${fmt(x)} mm by ${fmt(y)} mm in X and Y. Both axes are larger than the official 270 mm build volume, so rotating in the bed plane cannot make it fit.`,
    });
  } else if (x > BED_X && y > BED_Y) {
    warnings.push({
      level: "block",
      code: "part-too-wide",
      partId: part.id,
      source,
      message: `${part.name} is ${fmt(x)} mm by ${fmt(y)} mm, which is larger than the official 270 mm by 270 mm bed even after swapping X and Y.`,
    });
  } else if (Math.min(x, y) > BED_X || Math.max(x, y) > BED_X) {
    // One axis is over 270, the other might allow a rotation.
    if (Math.min(x, y) <= BED_X && Math.max(x, y) <= BED_Y) {
      // Fits if rotated. Not a block.
    } else if (Math.min(x, y) <= BED_X && Math.max(x, y) > BED_X) {
      warnings.push({
        level: "block",
        code: "part-too-wide",
        partId: part.id,
        source,
        message: `${part.name} has a long side of ${fmt(Math.max(x, y))} mm, which is larger than the official 270 mm bed.`,
      });
    }
  }
  if (z > BED_Z) {
    warnings.push({
      level: "block",
      code: "part-too-tall",
      partId: part.id,
      source,
      message: `${part.name} is ${fmt(z)} mm tall. The official build volume height is 270 mm.`,
    });
  }
  if (x <= 0 || y <= 0 || z <= 0) {
    warnings.push({
      level: "block",
      code: "part-invalid-size",
      partId: part.id,
      message: `${part.name} has a non-positive size (${fmt(x)} x ${fmt(y)} x ${fmt(z)} mm).`,
    });
  }
  return warnings;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function aabbFits(
  positionMm: [number, number, number],
  sizeMm: [number, number, number],
): boolean {
  const [x, y, z] = positionMm;
  const [sx, sy, sz] = sizeMm;
  if (x < 0 || y < 0 || z < 0) return false;
  if (x + sx > BED_X + 1e-9) return false;
  if (y + sy > BED_Y + 1e-9) return false;
  if (z + sz > BED_Z + 1e-9) return false;
  return true;
}

export type PackOptions = {
  gapMm: number;
  allowXyRotation: boolean;
};

export type PackResult = {
  placed: PlacedPart[];
  leftover: Part[];
};

/**
 * Pack parts onto the official 270 mm bed as axis-aligned boxes.
 * Positions already set on a part are honoured when they fit and do not
 * overlap earlier placements. Remaining parts use a shelf packer.
 * The gap is a planner spacing, not an official clearance.
 */
export function packParts(parts: Part[], options: PackOptions): PackResult {
  const placed: PlacedPart[] = [];
  const leftover: Part[] = [];

  const withPositions = parts.filter((part) => part.positionMm);
  const without = parts.filter((part) => !part.positionMm);

  for (const part of withPositions) {
    const position = part.positionMm!;
    const size = part.sizeMm;
    const candidate: PlacedPart = {
      ...part,
      positionMm: position,
      sizeMm: size,
      rotatedXy: false,
    };
    if (aabbFits(position, size) && !overlapsAny(candidate, placed, options.gapMm)) {
      placed.push(candidate);
    } else {
      leftover.push(part);
    }
  }

  const toPack = [...without, ...leftover].sort((a, b) => {
    const aArea = a.sizeMm[0] * a.sizeMm[1];
    const bArea = b.sizeMm[0] * b.sizeMm[1];
    return bArea - aArea;
  });
  leftover.length = 0;

  for (const part of toPack) {
    const packed = placeOnShelves(part, placed, options);
    if (packed) placed.push(packed);
    else leftover.push(part);
  }

  return { placed, leftover };
}

function overlapsAny(part: PlacedPart, placed: PlacedPart[], gapMm: number): boolean {
  return placed.some((other) => overlaps(part, other, gapMm));
}

function overlaps(a: PlacedPart, b: PlacedPart, gapMm: number): boolean {
  const ax1 = a.positionMm[0];
  const ay1 = a.positionMm[1];
  const ax2 = ax1 + a.sizeMm[0];
  const ay2 = ay1 + a.sizeMm[1];
  const bx1 = b.positionMm[0];
  const by1 = b.positionMm[1];
  const bx2 = bx1 + b.sizeMm[0];
  const by2 = by1 + b.sizeMm[1];
  const g = gapMm;
  return ax1 < bx2 + g && ax2 + g > bx1 && ay1 < by2 + g && ay2 + g > by1;
}

function candidatePoints(placed: PlacedPart[], gapMm: number): Array<[number, number]> {
  const points: Array<[number, number]> = [[0, 0]];
  for (const other of placed) {
    points.push([other.positionMm[0] + other.sizeMm[0] + gapMm, other.positionMm[1]]);
    points.push([other.positionMm[0], other.positionMm[1] + other.sizeMm[1] + gapMm]);
  }
  points.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  return points;
}

function placeOnShelves(
  part: Part,
  placed: PlacedPart[],
  options: PackOptions,
): PlacedPart | null {
  const orientations: Array<{ size: [number, number, number]; rotated: boolean }> = [
    { size: part.sizeMm, rotated: false },
  ];
  if (options.allowXyRotation && part.sizeMm[0] !== part.sizeMm[1]) {
    orientations.push({
      size: [part.sizeMm[1], part.sizeMm[0], part.sizeMm[2]],
      rotated: true,
    });
  }

  const points = candidatePoints(placed, options.gapMm);
  let best: PlacedPart | null = null;

  for (const orientation of orientations) {
    const [sx, sy, sz] = orientation.size;
    if (sx > BED_X || sy > BED_Y || sz > BED_Z) continue;
    for (const [x, y] of points) {
      if (x + sx > BED_X + 1e-9 || y + sy > BED_Y + 1e-9) continue;
      const candidate: PlacedPart = {
        ...part,
        positionMm: [x, y, 0],
        sizeMm: orientation.size,
        rotatedXy: orientation.rotated,
      };
      if (!overlapsAny(candidate, placed, options.gapMm)) {
        if (
          !best ||
          candidate.positionMm[1] < best.positionMm[1] ||
          (candidate.positionMm[1] === best.positionMm[1] &&
            candidate.positionMm[0] < best.positionMm[0])
        ) {
          best = candidate;
        }
      }
    }
  }
  return best;
}
