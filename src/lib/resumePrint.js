// How the resume's print button prints the PDF file (components/resume/ResumeViewer.jsx).

// WebKit browsers other than Chrome-family ones: desktop Safari names Safari and no Chromium.
const SAFARI = /Safari\//,
  NOT_SAFARI = /Chrome|Chromium|CriOS|Edg|OPR|FxiOS/,
  IOS = /iPhone|iPad|iPod/;

/**
 * "frame": print the file through a hidden frame (the browser's PDF engine prints real text).
 * "tab": open the file so the browser's own viewer prints it. Safari (desktop and every iPhone
 * browser, which are all WebKit) prints a framed PDF blank or one page short, a touch screen
 * is a phone or tablet, and a browser that says it has no PDF viewer can't show one in a frame.
 * `touch` is the app's own touch test (src/lib/egg/screen.js `isTouch`).
 */
export function printMode({ userAgent, touch, pdfViewerEnabled }) {
  if (touch || pdfViewerEnabled === false) return "tab";
  if (IOS.test(userAgent) || (SAFARI.test(userAgent) && !NOT_SAFARI.test(userAgent))) return "tab";
  return "frame";
}
