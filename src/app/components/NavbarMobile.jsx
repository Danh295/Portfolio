"use client"
import React, { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faDiagramProject, faSuitcase, faWrench } from '@fortawesome/free-solid-svg-icons';

import styles from './NavbarMobile.module.css';

export default function NavbarMobile() {
    const router = useRouter();
    const pathname = usePathname();
    // const [activePage, setActivePage] = useState('home');

    const pages = [
        { name: 'Home', path: '/', icon: faHouse},
        { name: 'Projects', path: '/projects', icon: faDiagramProject},
        { name: 'Career', path: '/career', icon: faSuitcase},
        { name: 'Skills', path: '/skills', icon: faWrench},
    ];

    const handleNaviation = (path, name) => {
        // setActivePage(name?.toLowerCase()); 
        router.push(path);
    }
    
  return (
    <div className={styles.navbarContainer}>
        <nav className={styles.navbar}>
            {pages.map((page, index) => (
            <button
                key={index}
                className={`${styles.navButton} ${pathname === page.path ? styles.active : ''}`}
                onClick={() => handleNaviation(page.path, page.name)}
            >
                <FontAwesomeIcon icon={page.icon} className={styles.icon}/>
            </button>
            ))}
        </nav> 
    </div>
  )
}
