import { test } from "node:test";
import assert from "node:assert/strict";
import Isolate from "@/components/Isolate";

// A class boundary is plain JS until React drives it, so its rule can be pinned here.
const make = (props) => {
  const b = new Isolate(props);
  return b;
};

test("Isolate shows its children until a render throws", () => {
  const b = make({ children: "kids", fallback: "fallback" });
  assert.equal(b.state.failed, false);
  assert.equal(b.render(), "kids");
});

test("a render error flips it to the fallback, and only the fallback", () => {
  const b = make({ children: "kids", fallback: "fallback" });
  b.state = { ...b.state, ...Isolate.getDerivedStateFromError(new Error("boom")) };
  assert.equal(b.state.failed, true);
  assert.equal(b.render(), "fallback");
});
