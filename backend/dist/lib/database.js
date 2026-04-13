"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMySql = exports.ensureIndex = exports.db = void 0;
const SyncMySql = require("sync-mysql");
const assertSafeIdentifier = (value, label) => {
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        throw new Error(`Unsafe ${label}: ${value}`);
    }
};
const createMySqlDatabase = () => {
    const host = process.env.MYSQL_HOST;
    const user = process.env.MYSQL_USER;
    const password = process.env.MYSQL_PASSWORD;
    const database = process.env.MYSQL_DATABASE;
    const port = Number(process.env.MYSQL_PORT || 3306);
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
exports.db = createMySqlDatabase();
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
const isMySql = () => true;
exports.isMySql = isMySql;
