import styles from "./Fallback.module.css";

/**
 * What shows where a part of the page failed to render (see Isolate): one line saying so, and
 * an `action` ({ label, onClick }) that puts the part away, when there is one.
 * `onRetry` (given by Isolate) adds a "try again" that renders the part afresh.
 * `floating` pins it above the bottom bar (the shell panel floats over the page).
 */
export default function Fallback({ what, action, onRetry, floating = false }) {
  return (
    <div role="alert" className={floating ? styles.floating : styles.box}>
      <span>{what} hit an error and was put away.</span>
      {onRetry && (
        <button type="button" className={styles.action} onClick={onRetry}>
          try again
        </button>
      )}
      {action && (
        <button type="button" className={styles.action} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
