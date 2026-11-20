import type { MicProblem } from "./mic";

/** What went wrong with the mic, and how to fix it, in a few words. */
export const MIC_HELP: Record<MicProblem, { title: string; detail: string }> = {
  denied: {
    title: "The mic is blocked",
    detail:
      "iPhone: open Settings, then Apps, Safari, Microphone, and pick Ask or Allow. Android: tap the icon left of the web address, then Permissions, Microphone, Allow. Then reload this page.",
  },
  busy: {
    title: "The mic is busy",
    detail: "Another app is using it: a call, a voice note or a recording. Finish there, then hold again.",
  },
  missing: {
    title: "No mic found",
    detail: "This phone didn't give the page a mic. Check it isn't switched off for the browser, then reload.",
  },
  unsupported: {
    title: "This browser can't record",
    detail: "Open the game in Safari on an iPhone or Chrome on Android.",
  },
  insecure: {
    title: "The mic needs a secure link",
    detail: "Open the https link to the games, not the laptop's network address.",
  },
  failed: {
    title: "The mic didn't start",
    detail: "Hold the button again. If it keeps failing, reload the page.",
  },
};

/** The mic didn't work: what happened and how to fix it, in the site's red. */
export function MicTrouble({ problem }: { problem: MicProblem }) {
  const { title, detail } = MIC_HELP[problem];
  return (
    <div className="ul-problem" role="alert">
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}
