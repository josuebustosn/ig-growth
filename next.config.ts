import { readFileSync } from "fs";
import { join } from "path";
import type { NextConfig } from "next";

// The version lives only in package.json. Reading it here and exposing it as a
// NEXT_PUBLIC_ variable means the header and the shared image cannot drift apart
// the way three hand-typed copies did.
const { version } = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf-8"),
) as { version: string };

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
};

export default nextConfig;
