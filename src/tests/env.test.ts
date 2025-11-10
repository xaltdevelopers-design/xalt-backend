import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getConfig } from "../utils/env.ts";

Deno.test("getConfig provides defaults", async () => {
  const cfg = await getConfig();
  assertEquals(cfg.MONGO_DB.length > 0, true);
  assertEquals(typeof cfg.PORT, "number");
});
