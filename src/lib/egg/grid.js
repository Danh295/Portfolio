// Character grid for the egg frame, derived from one setting (ui.eggFontPx). A smaller
// font packs more cells into the same ~600×460px frame, i.e. a higher-resolution
// render. The renderer's sampling is dense enough for 6–10px as is.
import { ui } from "@/config/ui";

export const EGG_FONT_PX = ui.eggFontPx;
export const EGG_CELL_W = EGG_FONT_PX * 0.6; // JetBrains Mono advance
export const EGG_ROWS = Math.round(460 / EGG_FONT_PX);
export const EGG_PX = EGG_ROWS * EGG_FONT_PX; // natural frame height

// Column limits, in the same pixel widths the frame had at the original 10px font.
export const colsFor = (widthPx, maxPx) =>
  Math.max(
    Math.floor(288 / EGG_CELL_W),
    Math.min(Math.floor(maxPx / EGG_CELL_W), Math.floor(widthPx / EGG_CELL_W)),
  );

// Things that move in cells per frame (confetti) scale with the grid.
export const EGG_GRID_SCALE = 10 / EGG_FONT_PX;
