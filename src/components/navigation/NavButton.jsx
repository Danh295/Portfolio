import styles from "./NavButton.module.css";

export default function NavButton({ label, href, isActive, onClick }) {
  return (
    <a
      href={href}
      className={`${styles.button} ${isActive ? styles.active : styles.inactive}`}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
    >
      <span className={styles.label}>{label}</span>
    </a>
  );
}
