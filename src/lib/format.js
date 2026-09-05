// Tiny formatting helpers shared by components and the (import-light) libs.

/** 3 → "03" */
export const pad = (n) => String(n).padStart(2, "0");

/** Lowercase any value. */
export const lc = (s) => String(s).toLowerCase();
