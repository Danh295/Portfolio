import { test } from "node:test";
import assert from "node:assert/strict";
import { copyText } from "@/lib/copyText";

test("copyText: true when the clipboard takes it, with the text it was given", async () => {
  let got = null;
  const nav = { clipboard: { writeText: async (t) => void (got = t) } };
  assert.equal(await copyText("abc", nav), true);
  assert.equal(got, "abc");
});

test("copyText: false (not a rejection) with no clipboard, a refusal or a throw", async () => {
  assert.equal(await copyText("x", undefined), false);
  assert.equal(await copyText("x", {}), false);
  assert.equal(
    await copyText("x", { clipboard: { writeText: () => Promise.reject(new Error()) } }),
    false,
  );
  assert.equal(
    await copyText("x", {
      clipboard: {
        writeText: () => {
          throw new Error("blocked");
        },
      },
    }),
    false,
  );
});
