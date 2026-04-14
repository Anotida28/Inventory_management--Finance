require("dotenv/config");

process.env.ALLOW_RUNTIME_SCHEMA_MUTATIONS = "true";

try {
  require("../dist/lib/authData.js");
  const receivingData = require("../dist/lib/receivingData.js");
  require("../dist/lib/operationsData.js");

  receivingData.reconcileReceivingReceiptDocumentStates();

  console.log("Operational schema bootstrap completed successfully.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Operational schema bootstrap failed: ${message}`);
  process.exit(1);
}
