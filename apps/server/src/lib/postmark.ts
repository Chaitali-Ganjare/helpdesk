import { ServerClient } from "postmark";

// Lazy singleton, not constructed at module load: unlike the Anthropic SDK
// (lib/anthropic.ts), ServerClient's constructor throws synchronously if
// POSTMARK_SERVER_TOKEN is missing/empty — eagerly constructing it here
// would crash the whole server at import time (routes/tickets.ts -> this
// module) in any environment that hasn't configured outbound email yet,
// taking down ticket listing/login/everything else with it, not just replies.
let client: ServerClient | undefined;

export function getPostmarkClient(): ServerClient {
  if (!client) {
    client = new ServerClient(process.env.POSTMARK_SERVER_TOKEN!);
  }
  return client;
}
