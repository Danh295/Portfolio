"use client"
import React, { useState, useEffect } from 'react'
import styles from './ImageCarousel.module.css'

// TODO: USE A LIBRARY TO MAKE INTERACTIVE & DYNAMIC

export default function ImageCarousel({ images }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        if (!images || images.length === 0) {
            console.error('ImageCarousel: No images provided');
            return;
        } else if (images.length === 1) {
            return <img src={images[0]} alt="Only image of the project :/" />;
        }
        const interval = setInterval(() => {
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % (images.length || 1));
        }, 3000); // change image every 3s

        return () => clearInterval(interval);
    }, [images.length]);

  return (
    <div>
        <img src={images[currentImageIndex]} alt="Project Image" />
    </div>
  )
}
