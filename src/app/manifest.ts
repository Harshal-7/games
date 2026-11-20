import type { MetadataRoute } from "next";

import { TABLE_COLORS } from "@/settings/settings";
import { AUTHOR } from "@/ui/site";

/**
 * Lets phones install the site like an app: full screen, felt green, with the icons that
 * scripts/draw-icons.mjs draws from icon.svg. iPhones take their icon from apple-icon.png.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Games",
    short_name: "Games",
    description: `Small browser games designed and built by ${AUTHOR}.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: TABLE_COLORS.felt,
    theme_color: TABLE_COLORS.felt,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
