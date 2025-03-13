"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation';
import NavButton from './NavButton';
import styles from './Navbar.module.css';

export default function Navbar() {
    const router = useRouter();
    const [activePage, setActivePage] = useState('home');

    const pages = [
        { name: 'Home', path: '/' },
        { name: 'Projects', path: '/projects' },
        { name: 'Career', path: '/career' },
        { name: 'Skills', path: '/skills' },
    ];

    const handleNaviation = (path, name) => {
        setActivePage(name?.toLowerCase()); 
        router.push(path);
    }

  return (
    <div>
        <nav className={styles.navbar}>
            {pages.map((page, index) => (
            <NavButton
                key={index}
                label={page.name}
                onClick={() => handleNaviation(page.path, page.name)}
                isActive={activePage === page.name?.toLowerCase()}
            />
            ))}
        </nav>
    </div>
  )
}
