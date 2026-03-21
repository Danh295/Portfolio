"use client"
import styles from './ProjectList.module.css'

export default function ProjectList({ projects, selectedProject, onSelectProject }) {
  return (
    <div>
      {projects.map((project, index) => (
        <div 
          key={index}
          className={`${styles.projectItem} 
            ${index === selectedProject 
              ? styles.selected
              : styles.unselected
            }`
          }
          onClick={() => onSelectProject(index)}
        >
          <h3>{project.title}</h3>
          <h4>{project.type}</h4>
          <h5>{project.date}</h5>
          <p>{project.description}</p>
        </div>  
      ))}
    </div>
  )
}
