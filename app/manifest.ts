import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kafila",
    short_name: "Kafila",
    description: "Group trip planning that's fair to everyone.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F6F1",
    theme_color: "#F4F6F1",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
