import { test } from "node:test";
import assert from "node:assert/strict";
import { printMode } from "@/lib/resumePrint";

// Real user-agent strings.
const UA = {
  chromeMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  edgeWin:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  firefoxMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.37 Mobile/15E148 Safari/604.1",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
};
const desktop = { touch: false, pdfViewerEnabled: true };

test("Chrome, Edge and Firefox on a desktop print through a hidden frame", () => {
  for (const ua of [UA.chromeMac, UA.edgeWin, UA.firefoxMac])
    assert.equal(printMode({ userAgent: ua, ...desktop }), "frame", ua);
});

// Printing a PDF from a frame is unreliable in Safari (desktop and iPhone: it can print blank or
// one page) and on phones; opening the file lets the browser's own viewer print it properly.
test("Safari, and every browser on an iPhone, open the file in a tab", () => {
  assert.equal(printMode({ userAgent: UA.safariMac, ...desktop }), "tab");
  assert.equal(
    printMode({ userAgent: UA.iphoneSafari, touch: true, pdfViewerEnabled: true }),
    "tab",
  );
  assert.equal(
    printMode({ userAgent: UA.iphoneChrome, touch: true, pdfViewerEnabled: true }),
    "tab",
  );
});

test("a touch screen or a browser with no PDF viewer of its own opens the file in a tab", () => {
  assert.equal(
    printMode({ userAgent: UA.androidChrome, touch: true, pdfViewerEnabled: false }),
    "tab",
  );
  assert.equal(printMode({ userAgent: UA.chromeMac, touch: true, pdfViewerEnabled: true }), "tab");
  assert.equal(
    printMode({ userAgent: UA.chromeMac, touch: false, pdfViewerEnabled: false }),
    "tab",
  );
});

test("a browser that doesn't say whether it has a PDF viewer is trusted to have one", () => {
  assert.equal(printMode({ userAgent: UA.chromeMac, touch: false }), "frame");
});
