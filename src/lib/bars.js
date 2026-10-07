// The sticky nav's and bottom bar's measured heights. App.jsx publishes them as --nav-h /
// --bar-h and fires BARS_MEASURED whenever they change (the nav and bar wrap on narrow
// screens), so anything measuring the band between them can measure again.

export const BARS_MEASURED = "danny:bars";

export function readBars() {
  const cs = getComputedStyle(document.documentElement);
  return {
    navH: Math.ceil(parseFloat(cs.getPropertyValue("--nav-h")) || 56),
    barH: Math.ceil(parseFloat(cs.getPropertyValue("--bar-h")) || 40),
  };
}
