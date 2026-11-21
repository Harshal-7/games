"use client";

/**
 * Sharing a result line: the phone's share sheet where there is one (phones, Safari),
 * else the clipboard. Both need a tap to start them, and the share sheet needs https.
 */
export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export async function copyText(text: string): Promise<ShareOutcome> {
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    // Older browsers, or plain http: the old way, through a hidden text box.
    try {
      const box = document.createElement("textarea");
      box.value = text;
      box.setAttribute("readonly", "");
      box.style.position = "fixed";
      box.style.opacity = "0";
      document.body.appendChild(box);
      box.select();
      const ok = document.execCommand("copy");
      box.remove();
      return ok ? "copied" : "failed";
    } catch {
      return "failed";
    }
  }
}

export async function shareText(text: string): Promise<ShareOutcome> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (e) {
      // Closing the sheet isn't an error; anything else falls back to copying.
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    }
  }
  return copyText(text);
}
