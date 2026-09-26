import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// The app imports the repo's own code instead of copying it:
//   @klamp/sdk        contract/sdk (canonical pool lookup, judge, compareRoutes)
//   @klamp/demo-sdk   contract/demo/sepolia/klamp-sdk.mjs (V4Quoter quote, Universal Router calldata and its check)
//   @deployments      contract/deployments (addresses)
// `dedupe` makes those files use this app's viem instead of the copies under contract/.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@klamp/sdk": fromRoot("../contract/sdk"),
      "@klamp/demo-sdk": fromRoot("../contract/demo/sepolia/klamp-sdk.mjs"),
      "@deployments": fromRoot("../contract/deployments"),
    },
    dedupe: ["viem"],
  },
  server: { fs: { allow: [".."] } },
});
