import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faLinkedinIn} from '@fortawesome/free-brands-svg-icons';
import { faEnvelope, faFileLines } from "@fortawesome/free-solid-svg-icons";

import style from './IconButton.module.css';

export default function IconButton({ icon, label, href, onClick, compact = false }) {

  // Determine icon to render    
  const getIcon = () => {
    switch (icon) {
      case "github":
        return <FontAwesomeIcon icon={faGithub} fixedWidth />;
      case "linkedin":
        return <FontAwesomeIcon icon={faLinkedinIn} fixedWidth />;
      case "email":
        return <FontAwesomeIcon icon={faEnvelope} fixedWidth />;
      case "resume":
        return <FontAwesomeIcon icon={faFileLines} fixedWidth />;
      default:
        return null;
    }
  };

  const opensInNewTab = href?.startsWith("http") || href?.endsWith(".pdf");

  return (
    <a
      className={`${style.iconButton} ${compact ? style.compact : ""}`}
      href={href}
      onClick={onClick}
      aria-label={label}
      target={opensInNewTab ? "_blank" : undefined}
      rel={opensInNewTab ? "noopener noreferrer" : undefined}
    >
      <span className={style.icon}>{getIcon()}</span>
      <span className={style.tooltip}>{label}</span>
    </a>
  )
}
