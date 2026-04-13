import path from "path";

const SyncMySql = require("sync-mysql");
const rpc = require("sync-rpc");

export type DatabaseDialect = "mysql" | "sqlserver";

export type DatabaseStatement = {
  all: (...params: any[]) => any[];
  get: (...params: any[]) => any;
  run: (...params: any[]) => any;
};

export type DatabaseLike = {
  dialect: DatabaseDialect;
  exec: (sql: string) => void;
  prepare: (sql: string) => DatabaseStatement;
  getTableColumns: (tableName: string) => string[];
  indexExists: (tableName: string, indexName: string) => boolean;
  getNumericSuffixSequence: (
    tableName: string,
    columnName: string,
    startIndex: number
  ) => number;
};

const assertSafeIdentifier = (value: string, label: string) => {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
};

type ResolvedMySqlConfig = {
  host?: string;
  user?: string;
  password?: string;
  database?: string;
  port?: number;
};

type ResolvedSqlServerConfig = {
  server: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  schema: string;
};

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

const isIpv4Address = (value: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(value);

const parseSqlServerUrl = (rawUrl: string): ResolvedSqlServerConfig => {
  const withoutScheme = rawUrl.slice("sqlserver://".length).trim();
  const firstSemicolon = withoutScheme.indexOf(";");
  const hostPort = firstSemicolon >= 0 ? withoutScheme.slice(0, firstSemicolon) : withoutScheme;
  const paramText = firstSemicolon >= 0 ? withoutScheme.slice(firstSemicolon + 1) : "";
  const [server = "", portText] = hostPort.split(":");

  const params: Record<string, string> = {};

  paramText
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const equalsIndex = entry.indexOf("=");

      if (equalsIndex < 0) {
        return;
      }

      const key = entry.slice(0, equalsIndex).trim().toLowerCase();
      const value = entry.slice(equalsIndex + 1).trim();
      params[key] = value;
    });

  return {
    server,
    port: portText ? Number(portText) : 1433,
    database: params.database || "",
    user: params.user || "",
    password: params.password,
    encrypt: parseBoolean(params.encrypt, true),
    trustServerCertificate: parseBoolean(params.trustservercertificate, false),
    schema: process.env.DB_SCHEMA || "omds",
  };
};

const resolveMySqlConfig = (): ResolvedMySqlConfig => {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl && databaseUrl.toLowerCase().startsWith("mysql://")) {
    const parsed = new URL(databaseUrl);

    return {
      host: parsed.hostname,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ""),
      port: parsed.port ? Number(parsed.port) : 3306,
    };
  }

  return {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: Number(process.env.MYSQL_PORT || 3306),
  };
};

const resolveSqlServerConfig = (): ResolvedSqlServerConfig | undefined => {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl || !databaseUrl.toLowerCase().startsWith("sqlserver://")) {
    return undefined;
  }

  const parsed = parseSqlServerUrl(databaseUrl);

  if (!parsed.server || !parsed.database || !parsed.user) {
    throw new Error(
      "DATABASE_URL is missing required sqlserver settings (server, database, user)."
    );
  }

  return parsed;
};

const createMySqlDatabase = (): DatabaseLike => {
  const resolved = resolveMySqlConfig();
  const host = resolved.host;
  const user = resolved.user;
  const password = resolved.password;
  const database = resolved.database;
  const port = resolved.port || 3306;

  if (!host || !user || !database) {
    throw new Error(
      "MYSQL_HOST, MYSQL_USER, and MYSQL_DATABASE must be set before the server starts"
    );
  }

  const createDatabaseIfMissing =
    process.env.MYSQL_AUTO_CREATE_DATABASE !== "false";

  if (createDatabaseIfMissing) {
    const bootstrapConnection = new SyncMySql({
      host,
      user,
      password,
      port,
      multipleStatements: true,
      timezone: "Z",
    });

    assertSafeIdentifier(database, "database name");
    bootstrapConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  }

  const mysql = new SyncMySql({
    host,
    user,
    password,
    database,
    port,
    multipleStatements: true,
    timezone: "Z",
  });

  return {
    dialect: "mysql",
    exec: (sql) => {
      mysql.query(sql);
    },
    prepare: (sql) => ({
      all: (...params: any[]) => {
        const result = mysql.query(sql, params);
        return Array.isArray(result) ? result : [];
      },
      get: (...params: any[]) => {
        const result = mysql.query(sql, params);
        return Array.isArray(result) ? result[0] : undefined;
      },
      run: (...params: any[]) => mysql.query(sql, params),
    }),
    getTableColumns: (tableName) => {
      assertSafeIdentifier(tableName, "table name");

      const rows = mysql.query(`SHOW COLUMNS FROM \`${tableName}\``);
      return Array.isArray(rows)
        ? rows.map((row: any) => row.Field as string)
        : [];
    },
    indexExists: (tableName, indexName) => {
      assertSafeIdentifier(tableName, "table name");
      assertSafeIdentifier(indexName, "index name");

      const rows = mysql.query(
        `
          SELECT INDEX_NAME
          FROM information_schema.statistics
          WHERE table_schema = DATABASE()
            AND table_name = ?
            AND index_name = ?
          LIMIT 1
        `,
        [tableName, indexName]
      );

      return Array.isArray(rows) && rows.length > 0;
    },
    getNumericSuffixSequence: (tableName, columnName, startIndex) => {
      assertSafeIdentifier(tableName, "table name");
      assertSafeIdentifier(columnName, "column name");

      const rows = mysql.query(
        `
          SELECT MAX(CAST(SUBSTRING(${columnName}, ${startIndex}) AS UNSIGNED)) AS sequence
          FROM ${tableName}
        `
      );

      return (Array.isArray(rows) && rows[0]?.sequence) || 0;
    },
  };
};

const createSqlServerDatabase = (
  config: ResolvedSqlServerConfig
): DatabaseLike => {
  const workerPath = path.join(__dirname, "../../scripts/sqlserverSyncWorker.js");
  const client = rpc(workerPath, {
    ...config,
    encrypt:
      config.encrypt &&
      !(config.trustServerCertificate && isIpv4Address(config.server)),
  });

  const qualifyTable = (tableName: string) => {
    assertSafeIdentifier(tableName, "table name");
    assertSafeIdentifier(config.schema, "schema name");

    return `[${config.schema}].[${tableName}]`;
  };

  const runQuery = (sql: string, params: any[] = []) => {
    return client({ type: "query", sql, params }) as {
      rows?: any[];
      rowsAffected?: number[];
    };
  };

  return {
    dialect: "sqlserver",
    exec: (sql) => {
      client({ type: "exec", sql });
    },
    prepare: (sql) => ({
      all: (...params: any[]) => runQuery(sql, params).rows || [],
      get: (...params: any[]) => {
        const rows = runQuery(sql, params).rows || [];
        return rows[0];
      },
      run: (...params: any[]) => runQuery(sql, params).rowsAffected || [],
    }),
    getTableColumns: (tableName) => {
      assertSafeIdentifier(tableName, "table name");

      const rows = runQuery(
        `
          SELECT COLUMN_NAME AS columnName
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `,
        [config.schema, tableName]
      ).rows;

      return Array.isArray(rows)
        ? rows.map((row: any) => row.columnName as string)
        : [];
    },
    indexExists: (tableName, indexName) => {
      assertSafeIdentifier(tableName, "table name");
      assertSafeIdentifier(indexName, "index name");

      const rows = runQuery(
        `
          SELECT TOP 1 name
          FROM sys.indexes
          WHERE object_id = OBJECT_ID(?)
            AND name = ?
        `,
        [`${config.schema}.${tableName}`, indexName]
      ).rows;

      return Array.isArray(rows) && rows.length > 0;
    },
    getNumericSuffixSequence: (tableName, columnName, startIndex) => {
      assertSafeIdentifier(tableName, "table name");
      assertSafeIdentifier(columnName, "column name");

      const rows = runQuery(
        `
          SELECT MAX(TRY_CONVERT(INT, SUBSTRING(${columnName}, ${startIndex}, 8000))) AS sequence
          FROM ${qualifyTable(tableName)}
        `
      ).rows;

      return (Array.isArray(rows) && rows[0]?.sequence) || 0;
    },
  };
};

const sqlServerConfig = resolveSqlServerConfig();

export const db: DatabaseLike = sqlServerConfig
  ? createSqlServerDatabase(sqlServerConfig)
  : createMySqlDatabase();

export const ensureIndex = (
  tableName: string,
  indexName: string,
  columns: string[],
  options: { unique?: boolean } = {}
) => {
  assertSafeIdentifier(tableName, "table name");
  assertSafeIdentifier(indexName, "index name");

  if (db.indexExists(tableName, indexName)) {
    return;
  }

  const indexColumns = columns.join(", ");
  const uniquePrefix = options.unique ? "UNIQUE " : "";

  db.exec(`CREATE ${uniquePrefix}INDEX ${indexName} ON ${tableName} (${indexColumns})`);
};

export const isMySql = () => db.dialect === "mysql";
