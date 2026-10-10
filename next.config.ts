import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the floating Next.js badge in development — it sits on top of the
  // navbar's sign-in button. Compile and runtime errors are still shown.
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
