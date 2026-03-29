import { forwardRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faBrain,
  faDatabase,
  faFileImage,
  faFileLines,
  faFilePdf,
  faGear,
  faImage,
  faLayerGroup,
  faMagnifyingGlass,
  faMobileScreenButton,
  faPlug,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import {
  SiC,
  SiCplusplus,
  SiCloudinary,
  SiCss,
  SiElectron,
  SiElevenlabs,
  SiExpress,
  SiFastapi,
  SiFramer,
  SiGit,
  SiGithub,
  SiGnubash,
  SiGooglegemini,
  SiHtml5,
  SiJavascript,
  SiLanggraph,
  SiLinux,
  SiMongodb,
  SiNextdotjs,
  SiNodedotjs,
  SiNumpy,
  SiOpenai,
  SiOpencv,
  SiOpenjdk,
  SiPaddlepaddle,
  SiPython,
  SiReact,
  SiStrapi,
  SiSupabase,
  SiTailwindcss,
  SiTypescript,
  SiVuedotjs,
  SiWebgl,
} from "react-icons/si";

import styles from "./TechTag.module.css";

const siMap = {
  C: SiC,
  "C++": SiCplusplus,
  "C/C++": SiC,
  "CSS Modules": SiCss,
  Cloudinary: SiCloudinary,
  Electron: SiElectron,
  ElevenLabs: SiElevenlabs,
  "Framer Motion": SiFramer,
  Gemini: SiGooglegemini,
  "Gemini API": SiGooglegemini,
  "GitHub Pages": SiGithub,
  Java: SiOpenjdk,
  CSS: SiCss,
  JavaScript: SiJavascript,
  LangGraph: SiLanggraph,
  TypeScript: SiTypescript,
  PaddleOCR: SiPaddlepaddle,
  PixiJS: SiWebgl,
  Python: SiPython,
  React: SiReact,
  ReactJS: SiReact,
  "Next.js": SiNextdotjs,
  "Tailwind CSS": SiTailwindcss,
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
  "OpenAI API": SiOpenai,
  "Node.js": SiNodedotjs,
  "Express.js": SiExpress,
  MongoDB: SiMongodb,
};

const faMap = {
  ChromaDB: faDatabase,
  "Image Processing": faWandMagicSparkles,
  Live2D: faLayerGroup,
  MCP: faPlug,
  "MCP Server": faPlug,
  "Multimodal AI": faBrain,
  OCR: faFileLines,
  "Responsive Design": faMobileScreenButton,
  Pillow: faImage,
  PyMuPDF: faFilePdf,
  Tavily: faMagnifyingGlass,
  Uvicorn: faBolt,
  pdf2image: faFileImage,
};

const TechTag = forwardRef(function TechTag(
  {
    label,
    compact = false,
    orbit = false,
    iconOnly = false,
    count = null,
    active = false,
    locked = false,
    onClose,
    as: Component = "span",
    className = "",
    ...props
  },
  ref,
) {
  const SiIcon = siMap[label];
  const faIcon = faMap[label];

  const iconClass = iconOnly
    ? styles.iconOnlyIcon
    : `${styles.icon} ${compact ? styles.iconCompact : ""} ${orbit ? styles.iconOrbit : ""}`;

  return (
    <Component
      ref={ref}
      className={`${styles.tag} ${iconOnly ? styles.iconOnly : ""} ${compact ? styles.compact : ""} ${orbit ? styles.orbit : ""} ${
        active ? styles.active : ""
      } ${locked ? styles.locked : ""} ${count !== null && !iconOnly ? styles.withCount : ""} ${className}`.trim()}
      {...(iconOnly ? { "aria-label": label } : {})}
      {...props}
    >
      {SiIcon ? (
        <SiIcon className={iconClass} />
      ) : (
        <FontAwesomeIcon
          icon={faIcon ?? faGear}
          className={iconClass}
        />
      )}
      {!iconOnly && <span className={styles.label}>{label}</span>}
      {!iconOnly && count !== null && (
        <span className={`${styles.countBadge} ${orbit ? styles.countBadgeOrbit : ""}`}>
          {count}
        </span>
      )}
      {locked && onClose && (
        <span
          role="button"
          tabIndex={0}
          className={styles.closeBadge}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }
          }}
          aria-label={`Deselect ${label}`}
        >
          ×
        </span>
      )}
    </Component>
  );
});

export default TechTag;
