import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "tesseract.js", "tesseract.js-core", "sharp"],
  outputFileTracingIncludes: {
    "/upload": [
      "./node_modules/tesseract.js-core/**/*",
      "./node_modules/tesseract.js/**/*",
    ],
    "/results/[id]": [
      "./node_modules/tesseract.js-core/**/*",
      "./node_modules/tesseract.js/**/*",
    ],
    "/api/upload": ["./node_modules/@vercel/blob/**/*"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "z1xgx9bfbcvkhh1u.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
