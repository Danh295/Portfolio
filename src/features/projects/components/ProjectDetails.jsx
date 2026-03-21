"use client"
import ImageCarousel from './ImageCarousel.jsx';

import styles from './ProjectDetails.module.css';

export default function ProjectDetails({ project }) {

    if (!project) {
        console.error('ProjectDetails: No project provided');
        return <p>
            No project selected (fallback)
        </p>
    }


  return (
    <div>
        {/* Links  */}
        {/* Todo: NEED A LINK BUTTON COMP */}
        <div className={styles.links}>
            {project.links?.map((link, index) => (
                <a key={index} href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.name}
                </a>
            ))}
        </div>

        {/* Image */}
        <ImageCarousel images={project.images || []} />

        {/* Tags */}
        {/* Todo: NEED A TAG COMP */}
        <div className={styles.tags}>
            {project.tags.map((tag, index) => (
                <span key={index}>{tag}</span>
            ))}
        </div>
    </div>
  )
}
