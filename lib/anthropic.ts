import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env";

export const anthropic = new Anthropic({
  apiKey: serverEnv.anthropicApiKey,
  baseURL: "https://anthropic.helicone.ai",
  defaultHeaders: {
    "helicone-auth": `Bearer ${serverEnv.heliconeApiKey}`,
  },
});
