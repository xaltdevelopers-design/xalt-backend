import { superoak } from "https://deno.land/x/superoak@4.7.0/mod.ts";
import { createApp } from "../server.ts";

Deno.test("GET /health returns 200", async () => {
  const app = createApp();
  const request = await superoak(app);
  await request.get("/health").expect(200).expect({ ok: true, status: "healthy" });
});
