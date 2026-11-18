// Copy text to the system clipboard and say whether it worked, pure over the `nav` it is given
// (navigator): no clipboard (an insecure page, an old browser), a refusal and a throw all answer
// false instead of rejecting, so a caller shows a note rather than failing silently.

/** Resolves true if `text` reached the clipboard, false otherwise. Never rejects. */
export async function copyText(text, nav) {
  try {
    const write = nav?.clipboard?.writeText;
    if (!write) return false;
    await write.call(nav.clipboard, text);
    return true;
  } catch {
    return false;
  }
}
