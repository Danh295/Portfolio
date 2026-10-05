import { site } from "@/config/site";
import styles from "./Redirect.module.css";

/**
 * Body of the old /projects/, /experience/ and /skills/ URLs: static export has no
 * server redirects, so a meta refresh sends them to the section on the home page (works
 * without JavaScript), with a plain link in case it doesn't.
 */
export default function Redirect({ section }) {
  const to = `${site.basePath}/#${section}`;
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${to}`} />
      <p className={styles.moved}>
        moved to <a href={to}>~/{section}</a>
      </p>
    </>
  );
}
