// "Held" (CONTEXT.md): the egg frame after a tap on a touch screen. One finger on the pot
// turns the egg and the page doesn't scroll there. Pure, so it's tested in node
// (test/eggHeld.test.mjs); the hero and terminal mode's inline egg read the browser and
// apply the result.

/**
 * The next held state.
 * @param {boolean} held
 * @param {{ type: "press", pointerType: string, inFrame: boolean }
 *   | { type: "stage", stage: number }
 *   | { type: "leave" }} event
 *   `press`: a pointer went down (anywhere on the page); `stage`: the egg moved to a stage
 *   (0–5, 5 is the result); `leave`: the egg left the screen's gui (a project page, terminal).
 */
export function heldAfter(held, event) {
  switch (event.type) {
    case "press":
      // Only a finger holds; a mouse or pen keeps what it has (it never needed holding).
      return event.pointerType === "touch" ? event.inFrame : held;
    case "stage":
      return event.stage === 5 ? false : held;
    case "leave":
      return false;
    default:
      return held;
  }
}
