// What kind of screen this is, for the egg: a touch screen (the static query the site's touch
// rules use: no hover, a coarse pointer; an iPad with a keyboard counts) and a phone's width
// (the layout breakpoint). DOM-reading, so it lives apart from the pure fit.js.

export const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";
export const PHONE_QUERY = "(max-width: 600px)";

export const isTouch = () => window.matchMedia(TOUCH_QUERY).matches;
export const isPhone = () => window.matchMedia(PHONE_QUERY).matches;
