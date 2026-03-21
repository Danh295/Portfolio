"use client"
import Image from 'next/image';
import { useState, useEffect } from 'react'

// TODO: USE A LIBRARY TO MAKE INTERACTIVE & DYNAMIC

export default function ImageCarousel({ images }) {
    const safeImages = images ?? [];
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        if (!images || images.length <= 1) {
            return;
        }

        const interval = setInterval(() => {
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % safeImages.length);
        }, 3000); // change image every 3s

        return () => clearInterval(interval);
    }, [images, safeImages.length]);

  if (safeImages.length === 0) {
    return null;
  }

  const activeImage = safeImages[currentImageIndex % safeImages.length];

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '280px' }}>
        <Image
          src={activeImage}
          alt="Project preview"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectFit: 'cover', borderRadius: '24px' }}
        />
    </div>
  )
}
