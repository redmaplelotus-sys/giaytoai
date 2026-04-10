import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/server-env";

export const anthropic = new Anthropic({
  apiKey: serverEnv.anthropicApiKey,
  ...(serverEnv.heliconeApiKey && {
    baseURL: "https://anthropic.helicone.ai",
    defaultHeaders: { "helicone-auth": `Bearer ${serverEnv.heliconeApiKey}` },
  }),
});
