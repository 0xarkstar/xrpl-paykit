import { PaykitClient } from "@paykit/sdk";
import { config } from "./config";

export function getPaykitClient() {
  return new PaykitClient({
    apiKey: config.paykitApiKey,
    baseUrl: config.paykitBaseUrl,
  });
}
