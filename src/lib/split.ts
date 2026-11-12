import { colorsFromParts, uniqueColors } from "./color";
import { packParts, partExceedsVolume, type PackOptions } from "./fit";
import type { Color, Part, ToolSlot, Warning } from "./types";
import { TOOL_SLOTS } from "./types";

const MAX_SLOTS = 4;

export function partColorCount(part: Part): number {
  return uniqueColors(part.colors).length;
}

export function colorUnionSize(parts: Part[]): number {
  return colorsFromParts(parts).length;
}

export function canShareJob(parts: Part[]): boolean {
  return colorUnionSize(parts) <= MAX_SLOTS && parts.every((part) => partColorCount(part) <= MAX_SLOTS);
}

export function tooManyColorsWarning(part: Part): Warning | null {
  const count = partColorCount(part);
  if (count <= MAX_SLOTS) return null;
  return {
    level: "block",
    code: "part-too-many-colors",
    partId: part.id,
    message: `${part.name} uses ${count} colours. A Snapmaker U1 loads four toolheads, so this part cannot print as a single U1 job without reducing colours. Fourload does not merge colours and does not claim the printer can swap spools mid-part.`,
  };
}

/**
 * Split parts into the fewest groups whose colour union is at most 4.
 * Exact search, pruned by a first-fit greedy upper bound. Falls back to
 * the greedy grouping if the search exceeds the step budget.
 */
export function partitionByColors(parts: Part[]): Part[][] {
  if (parts.length === 0) return [];
  const items = [...parts].sort((a, b) => partColorCount(b) - partColorCount(a));
  const greedy = greedyPartition(items);
  let best: Part[][] = greedy.map((group) => [...group]);
  let steps = 0;
  const budget = 20_000;

  function canAdd(group: Part[], part: Part): boolean {
    return colorUnionSize([...group, part]) <= MAX_SLOTS;
  }

  function search(index: number, groups: Part[][]): void {
    steps += 1;
    if (steps > budget) return;
    if (groups.length >= best.length) return;
    if (index === items.length) {
      best = groups.map((group) => [...group]);
      return;
    }
    const part = items[index]!;
    for (let i = 0; i < groups.length; i += 1) {
      if (!canAdd(groups[i]!, part)) continue;
      groups[i]!.push(part);
      search(index + 1, groups);
      groups[i]!.pop();
    }
    groups.push([part]);
    search(index + 1, groups);
    groups.pop();
  }

  search(0, []);
  return best;
}

export function greedyPartition(parts: Part[]): Part[][] {
  const groups: Part[][] = [];
  const items = [...parts].sort((a, b) => partColorCount(b) - partColorCount(a));
  for (const part of items) {
    const index = groups.findIndex((group) => colorUnionSize([...group, part]) <= MAX_SLOTS);
    if (index >= 0) groups[index]!.push(part);
    else groups.push([part]);
  }
  return groups;
}

export function assignSlots(parts: Part[]): Record<ToolSlot, Color | null> {
  const slots = {
    T0: null,
    T1: null,
    T2: null,
    T3: null,
  } as Record<ToolSlot, Color | null>;
  const colours = colorsFromParts(parts);
  colours.forEach((color, index) => {
    const slot = TOOL_SLOTS[index];
    if (slot) slots[slot] = color;
  });
  return slots;
}

export function splitIntoJobs(
  parts: Part[],
  packOptions: PackOptions,
): { jobs: Array<{ parts: ReturnType<typeof packParts>["placed"]; leftover: Part[] }>; blocked: Array<{ part: Part; reasons: Warning[] }> } {
  const blocked: Array<{ part: Part; reasons: Warning[] }> = [];
  const eligible: Part[] = [];

  for (const part of parts) {
    const reasons = [
      ...partExceedsVolume(part),
      tooManyColorsWarning(part),
    ].filter((warning): warning is Warning => Boolean(warning));
    if (part.colors.length === 0) {
      reasons.push({
        level: "block",
        code: "part-no-color",
        partId: part.id,
        message: `${part.name} has no colour assigned, so it cannot be placed in a toolhead slot.`,
      });
    }
    if (reasons.some((warning) => warning.level === "block")) blocked.push({ part, reasons });
    else eligible.push(part);
  }

  const jobs: Array<{ parts: ReturnType<typeof packParts>["placed"]; leftover: Part[] }> = [];
  const groups = partitionByColors(eligible);

  for (const group of groups) {
    let remaining = [...group];
    while (remaining.length > 0) {
      const packed = packParts(remaining, packOptions);
      if (packed.placed.length === 0) {
        // Should not happen for parts that passed volume checks, but fail closed.
        for (const part of packed.leftover) {
          blocked.push({
            part,
            reasons: [
              {
                level: "block",
                code: "part-unpackable",
                partId: part.id,
                message: `${part.name} passed the official 270 mm volume check but could not be placed on the bed with the current layout gap.`,
              },
            ],
          });
        }
        break;
      }
      jobs.push({ parts: packed.placed, leftover: packed.leftover });
      remaining = packed.leftover;
    }
  }

  return { jobs, blocked };
}
