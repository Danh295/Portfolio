// Where a PDF's links sit on the screen, as pure functions: pdf.js gives each link's rectangle
// in the page's own units (points, origin at the bottom-left); the viewer lays an <a> over the
// canvas at the matching spot (components/resume/ResumeViewer.jsx).

// A link in the file only ever becomes an anchor for a web or mail address.
const SAFE = /^(https?:|mailto:)/i;

/**
 * Boxes for the page's links. `view` is the page's [x0, y0, x1, y1] in points and `scale` is
 * CSS px per point. Each box is measured from the page's top-left, in CSS px. Rotated pages
 * aren't handled (the resume's has none).
 */
export function linkBoxes(annotations, view, scale) {
  const [x0, , , y1] = view;
  return annotations
    .filter((a) => a.subtype === "Link" && SAFE.test(a.url ?? ""))
    .map((a) => {
      const [ax, ay, bx, by] = a.rect;
      return {
        href: a.url,
        left: (Math.min(ax, bx) - x0) * scale,
        top: (y1 - Math.max(ay, by)) * scale,
        width: Math.abs(bx - ax) * scale,
        height: Math.abs(by - ay) * scale,
      };
    });
}
