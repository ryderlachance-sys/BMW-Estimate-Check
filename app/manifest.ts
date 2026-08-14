import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Engine Genie",
    short_name: "Engine Genie",
    description: "Compare mechanic parts charges with compatible retailer listings.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0066B1",
    categories: ["automotive", "shopping", "utilities"],
  };
}
