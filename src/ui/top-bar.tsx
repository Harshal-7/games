import type { ReactNode } from "react";

/** The bar at the top of a page: a way back on the left, page actions on the right. */
export function TopBar({ back, actions }: { back?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="topbar">
      {back ?? <span />}
      {actions}
    </header>
  );
}
