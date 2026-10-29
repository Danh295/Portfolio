import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import zlib from "node:zlib";
import { site } from "@/config/site";

// The resume is served from this repo to anyone: it must carry no phone number or email
// address (decided 2026-10-22). The text is found in compressed streams and in plain objects.
const pdfPath = new URL("../public/Danny_s_Resume.pdf", import.meta.url);

// What the PDF says, as text: its objects with the stream bodies cut out (the Info dictionary,
// XMP metadata and plain `/URI (mailto:...)` link annotations are not compressed), plus every
// inflated stream that isn't an embedded font (page content, annotations in object streams). A
// Type 1 font program carries its own copyright e-mail and number-like bounding boxes.
function pdfText(buf) {
  const raw = buf.toString("latin1");
  let text = raw.replace(/stream\r?\n[\s\S]*?\r?\nendstream/g, " ");
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      const s = zlib.inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
      if (!s.startsWith("%!")) text += s;
    } catch {
      // not a Flate stream (an image or a font): nothing to read
    }
  }
  return text;
}

// Contact details look like this; the file must carry none. Patterns, not your own data: this
// test is public, so it must not hold the values it guards against.
const CONTACT = [
  ["an email address", /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/i],
  ["a mailto: link", /mailto:/i],
  // A North American number, also as pdfTeX writes it: the area code's parentheses as \050 and
  // \051, then the rest with a hyphen (hyphen only: page coordinates are numbers too).
  // The parentheses of a bare `(555)` are PDF string syntax, so only the \050 form counts.
  ["a phone number", /\b\d{3}-\d{4}\b|\\050\d{3}\\051/],
  // Not in a run of numbers: font width arrays and coordinates are spaced digits too.
  ["a dotted or spaced phone number", /(?<![\d.]\s?)\d{3}[.\s]\d{3}[.\s]\d{4}(?!\s?[\d.])/],
  ["a +1 phone number", /\+1[\s.-]?\d{3}/],
  ["ten digits in a row", /(?<!\d)\d{10}(?!\d)/],
];
const leaks = (buf) => {
  const text = pdfText(buf);
  return CONTACT.filter(([, re]) => re.test(text)).map(([what]) => what);
};

test("the served resume PDF carries no email address or phone number", () => {
  const buf = fs.readFileSync(pdfPath);
  // Words are split by kerning ([(Da)-15(nny)]TJ), so check for the text operator itself.
  assert.match(pdfText(buf), /\]TJ/, "a page's text was decoded");
  assert.deepEqual(leaks(buf), []);
});

// Made-up details, in the forms the old export used: a link annotation, metadata, page text.
test("the check sees contact details in plain objects and in page text", () => {
  const link =
    "%PDF-1.5\n1 0 obj\n<< /Subtype /Link /A << /URI (mailto:jdoe0000@example.edu) >> >>\nendobj";
  assert.deepEqual(leaks(Buffer.from(link, "latin1")), ["an email address", "a mailto: link"]);
  const info = "%PDF-1.5\n2 0 obj\n<< /Author (Jane Doe 555 010-0199) >>\nendobj";
  assert.deepEqual(leaks(Buffer.from(info, "latin1")), ["a phone number"]);
  const page = "BT [(\\050555\\051)-333(010-0199)]TJ ET";
  assert.deepEqual(leaks(Buffer.from(page, "latin1")), ["a phone number"]);
});

test("the check passes a string of area-code-like digits and flags other phone formats", () => {
  // `(135)` closing a kerned word is a PDF string, not a phone number.
  assert.deepEqual(leaks(Buffer.from("BT [(CS)-333(135)]TJ ET", "latin1")), []);
  const dotted = Buffer.from("BT [(555.010.0199)]TJ ET", "latin1");
  assert.deepEqual(leaks(dotted), ["a dotted or spaced phone number"]);
  const spaced = Buffer.from("BT [(555 010 0199)]TJ ET", "latin1");
  assert.deepEqual(leaks(spaced), ["a dotted or spaced phone number"]);
  const plus = Buffer.from("BT [(+1 555)]TJ ET", "latin1");
  assert.deepEqual(leaks(plus), ["a +1 phone number"]);
  const bare = Buffer.from("BT [(5550100199)]TJ ET", "latin1");
  assert.deepEqual(leaks(bare), ["ten digits in a row"]);
  // digits spaced in a list of numbers are widths, not a phone number
  assert.deepEqual(leaks(Buffer.from("[500 500 1000 777.8 1000 1000]", "latin1")), []);
  // eleven digits is some other number, not ten in a row
  assert.deepEqual(leaks(Buffer.from("BT [(55501001990)]TJ ET", "latin1")), []);
});

test("the resume page and the PDF file are two addresses", () => {
  assert.equal(site.resume, site.basePath + "/resume/");
  assert.equal(site.resumePdf, site.basePath + "/Danny_s_Resume.pdf");
});
