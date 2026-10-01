/**
 * A hint for a one-character keyboard shortcut ("[h] ", "[j/k] move · "). Hidden while
 * single-key shortcuts are off (html[data-keys="off"] [data-hint] in globals.css, set from
 * src/lib/useKeysPref.js). Hints for keys that always work (esc, enter, arrows, tab) are
 * plain text. Put the trailing space inside, so hiding it leaves no gap.
 */
export default function Hint({ className, children }) {
  return (
    <span data-hint="" className={className}>
      {children}
    </span>
  );
}
