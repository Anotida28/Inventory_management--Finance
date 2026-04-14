const { createDB } = require("mysql-memory-server");
const mysql = require("mysql2/promise");

const DEV_DB_NAME = process.env.DEV_MYSQL_DATABASE || "omari_inventory";
const DEV_DB_PORT = Number(process.env.DEV_MYSQL_PORT || 3307);
const SYNC_USER = process.env.DEV_MYSQL_SYNC_USER || "omari_sync";
const SYNC_PASSWORD = process.env.DEV_MYSQL_SYNC_PASSWORD || "omari_sync_pw";
const keepAlive = setInterval(() => {}, 1 << 30);

const escapeSqlString = (value) => value.replace(/'/g, "''");
const escapeSqlIdentifier = (value) => value.replace(/`/g, "``");

const stopServer = async (db, signal) => {
  clearInterval(keepAlive);
  console.log(`Stopping ephemeral MySQL after ${signal}...`);
  await db.stop();
  process.exit(0);
};

const main = async () => {
  process.title = "omari-dev-mysql";

  const db = await createDB({
    dbName: DEV_DB_NAME,
    port: DEV_DB_PORT,
    version: "8.0.45",
    xEnabled: "OFF",
    logLevel: "ERROR",
  });

  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    user: db.username,
    password: "",
    database: db.dbName,
    port: db.port,
  });

  try {
    await connection.query(
      "INSTALL PLUGIN mysql_native_password SONAME 'mysql_native_password.dll'"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      !message.includes("already installed") &&
      !message.includes("Function 'mysql_native_password' already exists")
    ) {
      console.warn(`mysql_native_password plugin install warning: ${message}`);
    }
  }

  const escapedUser = escapeSqlString(SYNC_USER);
  const escapedPassword = escapeSqlString(SYNC_PASSWORD);
  const escapedDatabase = escapeSqlIdentifier(db.dbName);

  await connection.query(`
    CREATE USER IF NOT EXISTS '${escapedUser}'@'127.0.0.1'
    IDENTIFIED WITH mysql_native_password BY '${escapedPassword}'
  `);
  await connection.query(`
    GRANT ALL PRIVILEGES ON \`${escapedDatabase}\`.* TO '${escapedUser}'@'127.0.0.1'
  `);
  await connection.query("FLUSH PRIVILEGES");
  await connection.end();

  console.log("Ephemeral MySQL ready for local backend testing.");
  console.log(`MYSQL_HOST=127.0.0.1`);
  console.log(`MYSQL_PORT=${db.port}`);
  console.log(`MYSQL_DATABASE=${db.dbName}`);
  console.log(`MYSQL_USER=${SYNC_USER}`);
  console.log(`MYSQL_PASSWORD=${SYNC_PASSWORD}`);
  console.log(`MYSQL_AUTO_CREATE_DATABASE=false`);

  process.on("SIGINT", () => {
    void stopServer(db, "SIGINT");
  });
  process.on("SIGTERM", () => {
    void stopServer(db, "SIGTERM");
  });
};

main().catch((error) => {
  console.error("Failed to start ephemeral MySQL.");
  console.error(error);
  clearInterval(keepAlive);
  process.exit(1);
});
