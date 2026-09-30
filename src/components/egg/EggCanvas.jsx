import { EGG_FONT_PX, EGG_PX } from "@/lib/egg/grid";
import styles from "./EggCanvas.module.css";

// Font size and frame height come from the grid setting (src/lib/egg/grid.js).
const FRAME_STYLE = { "--egg-font": EGG_FONT_PX + "px", "--egg-h": EGG_PX + "px" };

/**
 * The ASCII frame: a base <pre> the game loop writes into, plus an FX layer for the
 * coloured glyphs. Both are filled imperatively — no React children.
 */
export default function EggCanvas({ preRef, fxRef, handlers, tip, label }) {
  return (
    <div className={styles.wrap} style={FRAME_STYLE}>
      <pre
        ref={preRef}
        className={styles.pre}
        data-tip={tip}
        role="img"
        aria-label={label}
        {...handlers}
      />
      <div ref={fxRef} className={styles.fx} aria-hidden="true" />
    </div>
  );
}
