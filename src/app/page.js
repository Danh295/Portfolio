import Image from "next/image";
import WaveEmoji from "./components/WaveEmoji";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      
      <header className={styles.header}>
        <Image 
          src="/pfp.png" alt="Profile picture" 
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
        </div>
        
      </header>

      <main className={styles.main}>
        <p>
            I'm a student currently studying computer science at the University of the Waterloo and business administration at Wilfrid Laurier University. I've had several 
            developer. I'm currently learning web development and I'm also
            exploring other fields in tech.
        </p>
      </main>

      <footer className={styles.footer}>
        
      </footer>
    </div>
  );
}
