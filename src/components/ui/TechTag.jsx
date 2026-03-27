import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faFileLines, faGear, faImage, faMobileScreenButton, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import {
  SiC,
  SiCplusplus,
  SiCss,
  SiCssmodules,
  SiFastapi,
  SiGit,
  SiGithub,
  SiGnubash,
  SiHtml5,
  SiJavascript,
  SiLinux,
  SiNextdotjs,
  SiNumpy,
  SiOpencv,
  SiOpenjdk,
  SiPython,
  SiReact,
  SiStrapi,
  SiSupabase,
  SiTailwindcss,
  SiTypescript,
  SiVuedotjs,
} from "react-icons/si";

import styles from "./TechTag.module.css";

const siMap = {
  C: SiC,
  "C++": SiCplusplus,
  "C/C++": SiC,
  "CSS Modules": SiCssmodules,
  Java: SiOpenjdk,
  CSS: SiCss,
  JavaScript: SiJavascript,
  TypeScript: SiTypescript,
  Python: SiPython,
  React: SiReact,
  ReactJS: SiReact,
  "Next.js": SiNextdotjs,
  Tailwind: SiTailwindcss,
  FastAPI: SiFastapi,
  OpenCV: SiOpencv,
  NumPy: SiNumpy,
  Git: SiGit,
  Bash: SiGnubash,
  Linux: SiLinux,
  Supabase: SiSupabase,
  Strapi: SiStrapi,
  "GitHub API": SiGithub,
  HTML: SiHtml5,
  Vue: SiVuedotjs,
};

const faMap = {
  "Image Processing": faWandMagicSparkles,
  OCR: faFileLines,
  "Responsive Design": faMobileScreenButton,
  Pillow: faImage,
  Uvicorn: faBolt,
};

export default function TechTag({ label, compact = false }) {
  const SiIcon = siMap[label];
  const faIcon = faMap[label];

  return (
    <span className={`${styles.tag} ${compact ? styles.compact : ""}`}>
      {SiIcon ? (
        <SiIcon className={`${styles.icon} ${compact ? styles.iconCompact : ""}`} />
      ) : (
        <FontAwesomeIcon icon={faIcon ?? faGear} className={`${styles.icon} ${compact ? styles.iconCompact : ""}`} />
      )}
      <span>{label}</span>
    </span>
  );
}
