import type { ComponentType, SVGProps } from "react";

import { KnightPiece } from "./ui/knight-piece";

/**
 * Board and piece styles. A skin is a set of CSS variables under
 * [data-skin="<id>"] in knights-tour.css plus the piece drawing. Only one for now;
 * new styles add one entry here and one CSS block.
 */
export const SKINS = {
  classic: { label: "Classic", Piece: KnightPiece },
} satisfies Record<string, { label: string; Piece: ComponentType<SVGProps<SVGSVGElement>> }>;

export type SkinId = keyof typeof SKINS;
