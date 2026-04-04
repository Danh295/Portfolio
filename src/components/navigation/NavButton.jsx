import styles from "./NavButton.module.css";

export default function NavButton({ label, href, isActive }) {
  return (
    <a
      href={href}
      className={`${styles.button} ${isActive ? styles.active : styles.inactive}`}
      aria-current={isActive ? "page" : undefined}
    >
      <span className={styles.label}>{label}</span>
    </a>
  );
}
