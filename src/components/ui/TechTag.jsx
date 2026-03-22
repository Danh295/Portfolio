import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faFileLines, faGear, faImage, faMobileScreenButton, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import {
  SiC,
  SiCplusplus,
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
  JavaScript: SiJavascript,
  TypeScript: SiTypescript,
  Python: SiPython,
  React: SiReact,
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

export default function TechTag({ label }) {
  const SiIcon = siMap[label];
  const faIcon = faMap[label];

  return (
    <span className={styles.tag}>
      {SiIcon ? (
        <SiIcon className={styles.icon} />
      ) : (
        <FontAwesomeIcon icon={faIcon ?? faGear} className={styles.icon} />
      )}
      <span>{label}</span>
    </span>
  );
}
