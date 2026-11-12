import type { Color } from "./types";

const HEX = /^#?([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/;

export function normalizeHex(input: string): string | null {
  const trimmed = input.trim();
  const match = HEX.exec(trimmed);
  if (!match) return null;
  return `#${match[1].toUpperCase()}`;
}

export function colorKey(color: Pick<Color, "hex">): string {
  return normalizeHex(color.hex) ?? color.hex.trim().toUpperCase();
}

export function uniqueColors(colors: Color[]): Color[] {
  const seen = new Map<string, Color>();
  for (const color of colors) {
    const key = colorKey(color);
    if (!seen.has(key)) seen.set(key, { ...color, hex: normalizeHex(color.hex) ?? color.hex });
  }
  return [...seen.values()];
}

export function colorsFromParts(parts: { colors: Color[] }[]): Color[] {
  return uniqueColors(parts.flatMap((part) => part.colors));
}

export function sameColor(a: Color, b: Color): boolean {
  return colorKey(a) === colorKey(b);
}
