import styles from "./Fallback.module.css";

/**
 * What shows where a part of the page failed to render (see Isolate): one line saying so, and
 * an `action` ({ label, onClick }) that puts the part away, when there is one.
 * `floating` pins it above the bottom bar (the shell panel floats over the page).
 */
export default function Fallback({ what, action, floating = false }) {
  return (
    <div role="alert" className={floating ? styles.floating : styles.box}>
      <span>{what} hit an error and was put away.</span>
      {action && (
        <button type="button" className={styles.action} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
