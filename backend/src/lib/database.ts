const SyncMySql = require("sync-mysql");

export type DatabaseDialect = "mysql";

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

const createMySqlDatabase = (): DatabaseLike => {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;
  const port = Number(process.env.MYSQL_PORT || 3306);

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

export const db: DatabaseLike = createMySqlDatabase();

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

export const isMySql = () => true;
