import { task } from "@trigger.dev/sdk/v3";

// Example task — replace with real background jobs as needed.
// See: https://trigger.dev/docs/v3/tasks

export const exampleTask = task({
  id: "example",
  run: async (payload: { message: string }) => {
    console.log("[trigger] example task:", payload.message);
    return { ok: true };
  },
});
