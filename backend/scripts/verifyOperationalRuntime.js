require("dotenv/config");

process.env.MYSQL_AUTO_CREATE_DATABASE = "false";

try {
  require("../dist/lib/authData.js");
  require("../dist/lib/receivingData.js");
  require("../dist/lib/operationsData.js");

  console.log("Operational schema verification passed.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Operational schema verification failed: ${message}`);
  process.exit(1);
}
