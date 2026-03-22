import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCss3Alt,
  faGithub,
  faHtml5,
  faJs,
  faPython,
  faReact,
  faVuejs,
} from "@fortawesome/free-brands-svg-icons";
import {
  faCode,
  faDatabase,
  faEye,
  faFileLines,
  faGear,
  faLayerGroup,
  faMobileScreenButton,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";

import styles from "./TechTag.module.css";

const iconMap = {
  "CSS Modules": faCss3Alt,
  "GitHub API": faGithub,
  HTML: faHtml5,
  "Image Processing": faWandMagicSparkles,
  JavaScript: faJs,
  "Next.js": faLayerGroup,
  OCR: faFileLines,
  OpenCV: faEye,
  Python: faPython,
  React: faReact,
  "Responsive Design": faMobileScreenButton,
  Supabase: faDatabase,
  TypeScript: faCode,
  Vue: faVuejs,
};

export default function TechTag({ label }) {
  const icon = iconMap[label] ?? faGear;

  return (
    <span className={styles.tag}>
      <FontAwesomeIcon icon={icon} className={styles.icon} />
      <span>{label}</span>
    </span>
  );
}
