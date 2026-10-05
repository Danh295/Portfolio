import { test } from "node:test";
import assert from "node:assert/strict";
import { isCurrent } from "@/lib/dates";

const on = (y, m, d) => new Date(Date.UTC(y, m - 1, d));

test("a month range is current from its first day through the end of its last month", () => {
  const r = "sep 2026 – dec 2026";
  assert.equal(isCurrent(r, on(2026, 8, 31)), false);
  assert.equal(isCurrent(r, on(2026, 9, 1)), true);
  assert.equal(isCurrent(r, on(2026, 12, 31)), true);
  assert.equal(isCurrent(r, on(2027, 1, 1)), false);
});

test("a year range runs through the end of its last year", () => {
  assert.equal(isCurrent("2024 – 2025", on(2025, 12, 31)), true);
  assert.equal(isCurrent("2024 – 2025", on(2026, 1, 1)), false);
  assert.equal(isCurrent("2024 – 2025", on(2023, 12, 31)), false);
});

test("an open-ended range is current once it starts", () => {
  assert.equal(isCurrent("jan 2027 – present", on(2027, 6, 1)), true);
  assert.equal(isCurrent("jan 2027 – present", on(2026, 12, 31)), false);
});

test("a date it can't read is never current", () => {
  assert.equal(isCurrent("sometime", on(2026, 10, 5)), false);
});

test("any dash, spacing or case reads the same", () => {
  const d = on(2026, 10, 5);
  for (const r of ["sep 2026–dec 2026", "Sep 2026 — Dec 2026", "sept 2026 - dec 2026"])
    assert.equal(isCurrent(r, d), true, r);
  assert.equal(isCurrent("jan 2027 – Present", on(2027, 2, 1)), true);
  assert.equal(isCurrent("oct 2026", d), true, "a single month");
  assert.equal(isCurrent("oct 2026", on(2026, 11, 1)), false);
});
