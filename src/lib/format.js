// Tiny formatting helpers shared by components and the (import-light) libs.

/** 3 → "03" */
export const pad = (n) => String(n).padStart(2, "0");

/** Lowercase any value. */
export const lc = (s) => String(s).toLowerCase();

/**
 * Join about-style paragraphs: a blank line after each string that doesn't carry its own
 * "\n" break (a single "\n" is a line break inside a paragraph).
 */
export const joinParagraphs = (arr) =>
  arr.map((p, i) => (i < arr.length - 1 && !p.endsWith("\n") ? p + "\n\n" : p)).join("");
