import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import zlib from "node:zlib";
import { site } from "@/config/site";

// The resume is served from this repo to anyone: it must carry no phone number or school
// email (decided 2026-10-22). The text is found in compressed streams and in plain objects.
const pdfPath = new URL("../public/Danny_s_Resume.pdf", import.meta.url);

// Everything in `buf` that could hold text. Streams are inflated (page content, annotations
// in object streams); the raw bytes are searched too, since the Info dictionary, XMP
// metadata and plain `/URI (mailto:...)` link annotations are not compressed.
function pdfText(buf) {
  const raw = buf.toString("latin1");
  let text = raw;
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      text += zlib.inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
    } catch {
      // not a Flate stream (an image or a font): nothing to read
    }
  }
  return text;
}

const SECRETS = ["0199", "jdoe0000", "example"];
const leaks = (buf) => SECRETS.filter((s) => pdfText(buf).includes(s));

test("the served resume PDF carries no phone number or school email", () => {
  const buf = fs.readFileSync(pdfPath);
  // Words are split by kerning ([(Da)-15(nny)]TJ), so check for the text operator itself.
  assert.match(pdfText(buf), /\]TJ/, "a page's text was decoded");
  assert.deepEqual(leaks(buf), []);
});

test("the check sees an address left in plain text, not only in compressed streams", () => {
  const plain =
    "%PDF-1.5\n1 0 obj\n<< /Subtype /Link /A << /URI (mailto:jdoe0000@example.edu) >> >>\nendobj";
  assert.deepEqual(leaks(Buffer.from(plain, "latin1")), ["jdoe0000", "example"]);
  const info = "%PDF-1.5\n2 0 obj\n<< /Author (Danny Hu 555 010-0199) >>\nendobj";
  assert.deepEqual(leaks(Buffer.from(info, "latin1")), ["0199"]);
});

test("the resume page and the PDF file are two addresses", () => {
  assert.equal(site.resume, site.basePath + "/resume/");
  assert.equal(site.resumePdf, site.basePath + "/Danny_s_Resume.pdf");
});
