// ─────────────────────────────────────────────────────────────────────────
// Data layer: the injector (composition seam).
//
// getRepository() is what the application/core layers call to obtain a
// Repository. Default transport is HTTP (the Seam B Data API) — so the seam is
// a real network boundary, honoring the "real HTTP at both seams" design and
// keeping the data service extractable. Set DATA_TRANSPORT=inprocess to bypass
// HTTP and talk to Postgres directly (perf escape hatch for a monolithic run).
//
// NOTE: the Seam B route handlers themselves must use getPgRepository()
// directly (they ARE the data service) — never getRepository(), or an HTTP
// client would loop back onto the API it's serving.
// ─────────────────────────────────────────────────────────────────────────

import type { Repository } from "@/lib/data/repository";
import { getPgRepository } from "@/lib/data/pg";
import { HttpDataClient } from "@/lib/data/http-client";

const globalForData = globalThis as unknown as { __uftHttpClient?: HttpDataClient };

export function getRepository(): Repository {
  if (process.env.DATA_TRANSPORT === "inprocess") return getPgRepository();
  if (!globalForData.__uftHttpClient) globalForData.__uftHttpClient = new HttpDataClient();
  return globalForData.__uftHttpClient;
}

export type { Repository } from "@/lib/data/repository";
export { getPgRepository } from "@/lib/data/pg";
