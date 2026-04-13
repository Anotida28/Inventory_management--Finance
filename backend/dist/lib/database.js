"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMySql = exports.ensureIndex = exports.db = void 0;
const path_1 = __importDefault(require("path"));
const SyncMySql = require("sync-mysql");
const rpc = require("sync-rpc");
const assertSafeIdentifier = (value, label) => {
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        throw new Error(`Unsafe ${label}: ${value}`);
    }
};
const parseBoolean = (value, fallback) => {
    if (typeof value !== "string") {
        return fallback;
    }
    return value.toLowerCase() === "true";
};
const isIpv4Address = (value) => /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
const parseSqlServerUrl = (rawUrl) => {
    const withoutScheme = rawUrl.slice("sqlserver://".length).trim();
    const firstSemicolon = withoutScheme.indexOf(";");
    const hostPort = firstSemicolon >= 0 ? withoutScheme.slice(0, firstSemicolon) : withoutScheme;
    const paramText = firstSemicolon >= 0 ? withoutScheme.slice(firstSemicolon + 1) : "";
    const [server = "", portText] = hostPort.split(":");
    const params = {};
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
const resolveMySqlConfig = () => {
    var _a;
    const databaseUrl = (_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.trim();
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
const resolveSqlServerConfig = () => {
    var _a;
    const databaseUrl = (_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.trim();
    if (!databaseUrl || !databaseUrl.toLowerCase().startsWith("sqlserver://")) {
        return undefined;
    }
    const parsed = parseSqlServerUrl(databaseUrl);
    if (!parsed.server || !parsed.database || !parsed.user) {
        throw new Error("DATABASE_URL is missing required sqlserver settings (server, database, user).");
    }
    return parsed;
};
const createMySqlDatabase = () => {
    const resolved = resolveMySqlConfig();
    const host = resolved.host;
    const user = resolved.user;
    const password = resolved.password;
    const database = resolved.database;
    const port = resolved.port || 3306;
    if (!host || !user || !database) {
        throw new Error("MYSQL_HOST, MYSQL_USER, and MYSQL_DATABASE must be set before the server starts");
    }
    const createDatabaseIfMissing = process.env.MYSQL_AUTO_CREATE_DATABASE !== "false";
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
        bootstrapConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
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
        getTableColumns: (tableName) => {
            assertSafeIdentifier(tableName, "table name");
            const rows = mysql.query(`SHOW COLUMNS FROM \`${tableName}\``);
            return Array.isArray(rows)
                ? rows.map((row) => row.Field)
                : [];
        },
        indexExists: (tableName, indexName) => {
            assertSafeIdentifier(tableName, "table name");
            assertSafeIdentifier(indexName, "index name");
            const rows = mysql.query(`
          SELECT INDEX_NAME
          FROM information_schema.statistics
          WHERE table_schema = DATABASE()
            AND table_name = ?
            AND index_name = ?
          LIMIT 1
        `, [tableName, indexName]);
            return Array.isArray(rows) && rows.length > 0;
        },
        getNumericSuffixSequence: (tableName, columnName, startIndex) => {
            var _a;
            assertSafeIdentifier(tableName, "table name");
            assertSafeIdentifier(columnName, "column name");
            const rows = mysql.query(`
          SELECT MAX(CAST(SUBSTRING(${columnName}, ${startIndex}) AS UNSIGNED)) AS sequence
          FROM ${tableName}
        `);
            return (Array.isArray(rows) && ((_a = rows[0]) === null || _a === void 0 ? void 0 : _a.sequence)) || 0;
        },
    };
};
const createSqlServerDatabase = (config) => {
    const workerPath = path_1.default.join(__dirname, "../../scripts/sqlserverSyncWorker.js");
    const client = rpc(workerPath, Object.assign(Object.assign({}, config), { encrypt: config.encrypt &&
            !(config.trustServerCertificate && isIpv4Address(config.server)) }));
    const qualifyTable = (tableName) => {
        assertSafeIdentifier(tableName, "table name");
        assertSafeIdentifier(config.schema, "schema name");
        return `[${config.schema}].[${tableName}]`;
    };
    const runQuery = (sql, params = []) => {
        return client({ type: "query", sql, params });
    };
    return {
        dialect: "sqlserver",
        exec: (sql) => {
            client({ type: "exec", sql });
        },
        prepare: (sql) => ({
            all: (...params) => runQuery(sql, params).rows || [],
            get: (...params) => {
                const rows = runQuery(sql, params).rows || [];
                return rows[0];
            },
            run: (...params) => runQuery(sql, params).rowsAffected || [],
        }),
        getTableColumns: (tableName) => {
            assertSafeIdentifier(tableName, "table name");
            const rows = runQuery(`
          SELECT COLUMN_NAME AS columnName
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `, [config.schema, tableName]).rows;
            return Array.isArray(rows)
                ? rows.map((row) => row.columnName)
                : [];
        },
        indexExists: (tableName, indexName) => {
            assertSafeIdentifier(tableName, "table name");
            assertSafeIdentifier(indexName, "index name");
            const rows = runQuery(`
          SELECT TOP 1 name
          FROM sys.indexes
          WHERE object_id = OBJECT_ID(?)
            AND name = ?
        `, [`${config.schema}.${tableName}`, indexName]).rows;
            return Array.isArray(rows) && rows.length > 0;
        },
        getNumericSuffixSequence: (tableName, columnName, startIndex) => {
            var _a;
            assertSafeIdentifier(tableName, "table name");
            assertSafeIdentifier(columnName, "column name");
            const rows = runQuery(`
          SELECT MAX(TRY_CONVERT(INT, SUBSTRING(${columnName}, ${startIndex}, 8000))) AS sequence
          FROM ${qualifyTable(tableName)}
        `).rows;
            return (Array.isArray(rows) && ((_a = rows[0]) === null || _a === void 0 ? void 0 : _a.sequence)) || 0;
        },
    };
};
const sqlServerConfig = resolveSqlServerConfig();
exports.db = sqlServerConfig
    ? createSqlServerDatabase(sqlServerConfig)
    : createMySqlDatabase();
const ensureIndex = (tableName, indexName, columns, options = {}) => {
    assertSafeIdentifier(tableName, "table name");
    assertSafeIdentifier(indexName, "index name");
    if (exports.db.indexExists(tableName, indexName)) {
        return;
    }
    const indexColumns = columns.join(", ");
    const uniquePrefix = options.unique ? "UNIQUE " : "";
    exports.db.exec(`CREATE ${uniquePrefix}INDEX ${indexName} ON ${tableName} (${indexColumns})`);
};
exports.ensureIndex = ensureIndex;
const isMySql = () => exports.db.dialect === "mysql";
exports.isMySql = isMySql;
