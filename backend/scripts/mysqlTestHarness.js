const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { createDB } = require("mysql-memory-server");
const mysql2 = require("mysql2/promise");
const SyncMySql = require("sync-mysql");

const mysqlTempRoot = path.join(__dirname, "..", ".mysql-test-runtime");
fs.mkdirSync(mysqlTempRoot, { recursive: true });
process.env.TEMP = mysqlTempRoot;
process.env.TMP = mysqlTempRoot;

const mysqlVersion = "8.0.45";
const mysqlBinaryRoot = path.join(
  mysqlTempRoot,
  "mysqlmsn",
  "binaries",
  mysqlVersion
);
const mysqlBinaryInstallPath = path.join(mysqlBinaryRoot, "mysql");
const mysqlBinaryExecutable = path.join(
  mysqlBinaryInstallPath,
  "bin",
  "mysqld.exe"
);

const ensureMySqlBinaryInstalled = () => {
  if (fs.existsSync(mysqlBinaryExecutable)) {
    return;
  }

  fs.mkdirSync(mysqlBinaryRoot, { recursive: true });

  const archivePath = path.join(
    mysqlBinaryRoot,
    `mysql-${mysqlVersion}-winx64.zip`
  );
  const extractedPath = path.join(
    mysqlBinaryRoot,
    `mysql-${mysqlVersion}-winx64`
  );

  if (!fs.existsSync(archivePath)) {
    execFileSync(
      "curl.exe",
      [
        "-L",
        "-o",
        archivePath,
        `https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-${mysqlVersion}-winx64.zip`,
      ],
      { stdio: "inherit" }
    );
  }

  if (!fs.existsSync(extractedPath)) {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${mysqlBinaryRoot}' -Force`,
      ],
      { stdio: "inherit" }
    );
  }

  if (!fs.existsSync(mysqlBinaryInstallPath)) {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Rename-Item -LiteralPath '${extractedPath}' -NewName 'mysql'`,
      ],
      { stdio: "inherit" }
    );
  }
};

const createQueryWrapper = (mysql) => ({
  exec: (sql) => mysql.query(sql),
  prepare: (sql) => ({
    all: (...params) => {
      const result = mysql.query(sql, params);
      return Array.isArray(result) ? result : [];
    },
    get: (...params) => {
      const result = mysql.query(sql, params);
      return Array.isArray(result) ? result[0] : undefined;
    },
    run: (...params) => mysql.query(sql, params),
  }),
});

const applyMySqlEnv = (dbServer) => {
  process.env.MYSQL_HOST = "127.0.0.1";
  process.env.MYSQL_PORT = String(dbServer.port);
  process.env.MYSQL_DATABASE = dbServer.dbName;
  process.env.MYSQL_USER = "omari_sync";
  process.env.MYSQL_PASSWORD = "omari_sync_pw";
  process.env.MYSQL_AUTO_CREATE_DATABASE = "false";
};

const clearMySqlEnv = () => {
  delete process.env.MYSQL_HOST;
  delete process.env.MYSQL_PORT;
  delete process.env.MYSQL_DATABASE;
  delete process.env.MYSQL_USER;
  delete process.env.MYSQL_PASSWORD;
  delete process.env.MYSQL_AUTO_CREATE_DATABASE;
};

const createMysqlTestHarness = async (dbName) => {
  ensureMySqlBinaryInstalled();

  const dbServer = await createDB({
    dbName,
    version: mysqlVersion,
    xEnabled: "OFF",
    logLevel: "ERROR",
  });

  const bootstrapConnection = await mysql2.createConnection({
    host: "127.0.0.1",
    user: dbServer.username,
    password: "",
    database: dbServer.dbName,
    port: dbServer.port,
  });

  await bootstrapConnection.query(`
    CREATE USER IF NOT EXISTS 'omari_sync'@'127.0.0.1'
    IDENTIFIED WITH mysql_native_password BY 'omari_sync_pw'
  `);
  await bootstrapConnection.query(`
    GRANT ALL PRIVILEGES ON \`${dbServer.dbName}\`.* TO 'omari_sync'@'127.0.0.1'
  `);
  await bootstrapConnection.query("FLUSH PRIVILEGES");
  await bootstrapConnection.end();

  applyMySqlEnv(dbServer);

  const mysql = new SyncMySql({
    host: "127.0.0.1",
    user: "omari_sync",
    password: "omari_sync_pw",
    database: dbServer.dbName,
    port: dbServer.port,
    multipleStatements: true,
    timezone: "Z",
  });

  return {
    db: createQueryWrapper(mysql),
    stop: async () => {
      clearMySqlEnv();
      await dbServer.stop();
    },
  };
};

module.exports = {
  createMysqlTestHarness,
};
