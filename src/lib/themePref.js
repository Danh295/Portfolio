// Which theme a visitor gets, pure: their saved choice, else their OS setting. The pre-paint
// script in app/layout.js makes the same call (it runs before any module, so it can't import this).

/** Dark? `saved` is the stored "dark" / "light" (anything else = never chose), `osLight` the OS. */
export const isDark = (saved, osLight) =>
  saved === "dark" || saved === "light" ? saved === "dark" : !osLight;

/** Does a `storage` event change the theme? Its key is the theme's, or null on a clear. */
export const themeKeyChanged = (key, themeKey) => key === null || key === themeKey;
