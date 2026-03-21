import styles from "./Footer.module.css";

const footerLinks = [
  { label: "Email", href: "mailto:hudanny295@gmail.com" },
  { label: "GitHub", href: "https://github.com/Danh295" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/danny-hu-395380225/" },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.copy}>© 2026 Danny Hu</p>
      <div className={styles.links}>
        {footerLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className={styles.link}
            target={link.href.startsWith("http") ? "_blank" : undefined}
            rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {link.label}
          </a>
        ))}
      </div>
    </footer>
  );
}
