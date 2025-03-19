import Image from "next/image";
import WaveEmoji from "./components/WaveEmoji";
import IconButton from "./components/IconButton";

import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      
      <header className={styles.header}>
        <Image 
          src="/temp.jpg" alt="" 
          width={350} height={520}
          className={styles.profile} 
        />
         
        <div className={styles["header-content"]}>
          <h2>
            <span>Hello! I'm </span>
            <span className={styles.name}>Danny</span>
            <WaveEmoji />
          </h2>
          <h1 className={styles.title}>Student/Developer</h1>
          <h3 className={styles.descr}>Ontario, Canada</h3>

          {/* Socials & Links */}
          <div className={styles["social-links"]}>
            <IconButton icon="github" href="https://github.com/Danh295" />
            <IconButton icon="linkedin" href="https://www.linkedin.com/in/danny-hu-395380225/" />
            <IconButton icon="email" href="mailto:hudanny295@gmail.com" />
            <IconButton icon="resume" href="/resume.pdf" />

          </div>


        </div>
        
      </header>

      <main className={styles.main}>
        <p>
          I'm a student currently studying BCS at the University of the Waterloo and BBA at Wilfrid Laurier University. As a developer, I have several experiences as a full-stack web developer both professionally and in my own time. 
          With a passion for software development, I'm currently exploring web development, as well other fields in tech through my ambitions in computer science.
        </p>
      </main>

    </div>
  );
}
