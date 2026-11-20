"use client";

import { useId, type ReactNode } from "react";

/**
 * The one "are you sure?" card for the whole site: the safe choice first, on the
 * left and with the focus; the action second, in the game's colour.
 */
export function Confirm({
  title,
  detail,
  yes,
  no = "Cancel",
  onYes,
  onNo,
}: {
  title: string;
  detail: ReactNode;
  yes: string;
  no?: string;
  onYes: () => void;
  onNo: () => void;
}) {
  const id = useId();
  return (
    <div className="confirm" role="alertdialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-detail`}>
      <strong className="confirm-title" id={`${id}-title`}>
        {title}
      </strong>
      <p id={`${id}-detail`}>{detail}</p>
      <div className="confirm-actions">
        <button type="button" className="btn" onClick={onNo} autoFocus>
          {no}
        </button>
        <button type="button" className="btn btn-primary" onClick={onYes}>
          {yes}
        </button>
      </div>
    </div>
  );
}
