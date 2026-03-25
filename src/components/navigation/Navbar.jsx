"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import IconButton from "@/components/ui/IconButton";
import NavButton from "./NavButton";
import { navigationItems } from "@/config/navigation";
import styles from "./Navbar.module.css";

function normalizePath(path) {
  if (!path || path === "/") {
    return "/";
  }

  return path.replace(/\/+$/, "");
}

export default function Navbar() {
  const pathname = usePathname();
  const currentPath = normalizePath(pathname);
  const showActions = currentPath !== "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.navbarCompact : ""}`}>
      <div className={styles.sideSlot} aria-hidden="true" />

      <div className={styles.links}>
        {navigationItems.map((page) => (
          <NavButton
            key={page.path}
            label={page.name}
            href={page.path}
            isActive={currentPath === normalizePath(page.path)}
          />
        ))}
      </div>

      <div className={styles.actions} data-visible={showActions}>
        {showActions ? (
          <IconButton compact icon="email" label="Email Danny Hu" href="mailto:hudanny295@gmail.com" />
        ) : null}
        {showActions ? (
          <IconButton compact icon="github" label="GitHub" href="https://github.com/Danh295" />
        ) : null}
        {showActions ? (
          <IconButton compact icon="resume" label="Open resume" href="/Danny_s_Resume.pdf" />
        ) : null}
      </div>
    </nav>
  );
}
