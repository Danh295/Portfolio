/**
 * A hint for a one-character keyboard shortcut ("[h] ", "[j/k] move · "). Hidden while
 * single-key shortcuts are off (html[data-keys="off"] [data-hint] in globals.css, set from
 * src/lib/useKeysPref.js) and on touch screens (the same file). Hints for keys that always
 * work (esc, enter, arrows, tab) are plain text, or `KeyLabel` when they should still go on
 * touch. Put the trailing space inside, so hiding it leaves no gap.
 */
export default function Hint({ className, children }) {
  return (
    <span data-hint="" className={className}>
      {children}
    </span>
  );
}

/**
 * A key label that still works with shortcuts off ([esc], [↲], [←], [tab]) but means
 * nothing on a touch screen: hidden there only (`html [data-keyhint]` in globals.css).
 */
export function KeyLabel({ className, children }) {
  return (
    <span data-keyhint="" className={className}>
      {children}
    </span>
  );
}

/** The touch wording that stands in for a `KeyLabel` ("tap to "): shown on touch only. */
export function TouchText({ children }) {
  return <span data-touch="">{children}</span>;
}
