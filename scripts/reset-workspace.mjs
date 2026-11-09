// Delete the demo workspace room so the rule map starts again from the seed.
// Usage: node --env-file=.env.local scripts/reset-workspace.mjs
import { Liveblocks } from "@liveblocks/node";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY,
  baseUrl: process.env.LIVEBLOCKS_BASE_URL || undefined,
});

try {
  await liveblocks.deleteRoom("ws-demo");
  console.log("ws-demo deleted; it will be re-seeded on next use");
} catch (err) {
  console.log(err?.status === 404 ? "ws-demo did not exist" : `failed: ${err?.message}`);
}
