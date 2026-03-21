"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faDiagramProject, faSuitcase, faWrench } from '@fortawesome/free-solid-svg-icons';
import { navigationItems } from '@/config/navigation';

import styles from './NavbarMobile.module.css';

function normalizePath(path) {
    if (!path || path === '/') {
        return '/';
    }

    return path.replace(/\/+$/, '');
}

export default function NavbarMobile() {
    const pathname = usePathname();
    const currentPath = normalizePath(pathname);

    const pages = navigationItems.map((page) => ({
        ...page,
        icon:
            page.path === '/'
                ? faHouse
                : page.path === '/projects'
                ? faDiagramProject
                : page.path === '/career'
                ? faSuitcase
                : faWrench,
    }));
    
  return (
    <div className={styles.navbarContainer}>
        <nav className={styles.navbar}>
            {pages.map((page, index) => (
            <Link
                href={page.path}
                key={index}
                className={`${styles.navButton} ${currentPath === normalizePath(page.path) ? styles.active : ''}`}
                aria-current={currentPath === normalizePath(page.path) ? 'page' : undefined}
                aria-label={page.name}
                title={page.name}
            >
                <FontAwesomeIcon icon={page.icon} className={styles.icon}/>
            </Link>
            ))}
        </nav> 
    </div>
  )
}
