import { getDb } from "../src/db/mongo.ts";

async function main() {
  const db = await getDb();
  // Support both deno mongo driver and node driver return shapes
  const col: any = db.collection("company");
  console.log("Removing 'nextPiSerial' field from all company documents (if present)...");
  const res = await col.updateMany({}, { $unset: { nextPiSerial: "" } });
  // Print a friendly summary depending on result shape
  const modified = res?.modifiedCount ?? res?.modified_count ?? res?.nModified ?? res?.matchedCount ?? res?.matched_count ?? null;
  console.log("Result:", res);
  console.log("Modified / matched count (best-effort):", modified);
}

main().catch((err) => {
  console.error(err);
  Deno.exit(1);
});
