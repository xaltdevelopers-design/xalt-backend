import { getDb } from "../src/db/mongo.ts";

async function main() {
  const db = await getDb();
  const col: any = db.collection("company");
  // Remove serial from piPrefix and invoicePrefix for all companies
  const companies = await col.find({}).toArray();
  for (const company of companies) {
    let piPrefix = company.piPrefix || "";
    let invoicePrefix = company.invoicePrefix || "";
    // Remove trailing serial (e.g. '0001', '20260001', etc.)
    piPrefix = piPrefix.replace(/([\d\s\/-]*)(\d{4,})$/, "");
    invoicePrefix = invoicePrefix.replace(/([\d\s\/-]*)(\d{4,})$/, "");
    await col.updateOne({ _id: company._id }, { $set: { piPrefix, invoicePrefix } });
    console.log(`Updated company ${company.companyName}: piPrefix='${piPrefix}', invoicePrefix='${invoicePrefix}'`);
  }
  console.log("All company prefixes fixed!");
}

main().catch((err) => {
  console.error(err);
});