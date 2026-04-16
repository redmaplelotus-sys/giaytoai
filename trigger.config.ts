import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "giaytoai",
  runtime: "node",
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
    },
  },
  dirs: ["./trigger"],
});
