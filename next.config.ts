import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // The version has exactly one home: the "version" field of package.json. It used
  // to be typed by hand in the two page headers and again on the share canvas, and
  // the canvas had already drifted (1.3 against 1.3.1). Injecting it here as a
  // NEXT_PUBLIC_ value inlines it into the client bundle at build time, which is
  // what lib/brand.ts reads. Only the string is bundled, not package.json itself.
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
};

export default nextConfig;
