"use client";

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

  return (
    <nav className={styles.navbar}>
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

      {showActions ? (
        <div className={styles.actions}>
          <IconButton compact icon="email" label="Email Danny Hu" href="mailto:hudanny295@gmail.com" />
          <IconButton compact icon="github" label="GitHub" href="https://github.com/Danh295" />
          <IconButton compact icon="resume" label="Open resume" href="/Danny_s_Resume.pdf" />
        </div>
      ) : null}
    </nav>
  );
}
