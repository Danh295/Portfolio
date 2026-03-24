"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBriefcase,
  faCode,
  faFolderOpen,
  faHouse,
} from "@fortawesome/free-solid-svg-icons";
import { navigationItems } from "@/config/navigation";

import styles from "./NavbarMobile.module.css";

function normalizePath(path) {
  if (!path || path === "/") {
    return "/";
  }

  return path.replace(/\/+$/, "");
}

export default function NavbarMobile() {
  const pathname = usePathname();
  const currentPath = normalizePath(pathname);
  const [isOpen, setIsOpen] = useState(false);

  const pages = navigationItems.map((page) => ({
    ...page,
    icon:
      page.path === "/"
        ? faHouse
        : page.path === "/projects/"
          ? faFolderOpen
          : page.path === "/experience/"
            ? faBriefcase
            : faCode,
  }));

  return (
    <div className={styles.wrapper}>
      <div className={styles.menuCluster}>
        <button
          type="button"
          className={`${styles.menuButton} ${isOpen ? styles.menuButtonOpen : ""}`}
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="mobile-site-menu"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          <span className={styles.menuTooltip}>{isOpen ? "Close menu" : "Open menu"}</span>
          <span className={styles.menuBars} aria-hidden="true">
            <span className={styles.bar} />
            <span className={styles.bar} />
            <span className={styles.bar} />
          </span>
        </button>

        <nav
          id="mobile-site-menu"
          className={`${styles.dropdown} ${isOpen ? styles.dropdownOpen : ""}`}
          aria-label="Mobile navigation"
          aria-hidden={!isOpen}
        >
          {pages.map((page, index) => {
            const isActive = currentPath === normalizePath(page.path);

            return (
              <Link
                href={page.path}
                key={page.path}
                className={`${styles.navIconButton} ${isActive ? styles.active : ""}`}
                aria-current={isActive ? "page" : undefined}
                aria-label={page.name}
                onClick={() => setIsOpen(false)}
                style={{ transitionDelay: isOpen ? `${index * 40}ms` : "0ms" }}
              >
                <FontAwesomeIcon icon={page.icon} className={styles.icon} />
                <span className={styles.tooltip}>{page.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
