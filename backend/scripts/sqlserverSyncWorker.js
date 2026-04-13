const sql = require("mssql");

const tableNames = [
  "auth_users",
  "suppliers",
  "branches",
  "receiving_receipts",
  "receiving_receipt_lines",
  "hq_stock_items",
  "issue_records",
  "attachments",
  "hq_serial_assets",
  "stock_movements",
  "stock_locations",
  "hq_stock_location_balances",
];

const withQualifiedTables = (rawSql, schema) => {
  return rawSql.replace(
    /\b(FROM|JOIN|INTO|UPDATE|TABLE|ON)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    (full, keyword, tableName) => {
      if (!tableNames.includes(tableName)) {
        return full;
      }

      return `${keyword} [${schema}].[${tableName}]`;
    }
  );
};

const convertPlaceholders = (rawSql, params) => {
  let index = 0;
  const convertedSql = rawSql.replace(/\?/g, () => {
    index += 1;
    return `@p${index}`;
  });

  const sqlWithLimit = convertedSql.replace(
    /\sLIMIT\s+@p(\d+)/i,
    " OFFSET 0 ROWS FETCH NEXT @p$1 ROWS ONLY"
  );

  return {
    sqlText: sqlWithLimit,
    placeholders: index,
    params,
  };
};

const createRequest = (pool, activeTransaction) => {
  if (activeTransaction) {
    return new sql.Request(activeTransaction);
  }

  return pool.request();
};

module.exports = (config) => {
  let poolPromise;
  let activeTransaction = null;

  const getPool = async () => {
    if (!poolPromise) {
      poolPromise = sql.connect({
        server: config.server,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        options: {
          encrypt: config.encrypt,
          trustServerCertificate: config.trustServerCertificate,
        },
      });
    }

    return poolPromise;
  };

  const executeQuery = async (rawSql, params = []) => {
    const pool = await getPool();
    const transformed = withQualifiedTables(rawSql, config.schema || "omds");
    const { sqlText, placeholders } = convertPlaceholders(transformed, params);
    const request = createRequest(pool, activeTransaction);

    for (let i = 1; i <= placeholders; i += 1) {
      request.input(`p${i}`, params[i - 1]);
    }

    const result = await request.query(sqlText);

    return {
      rows: result.recordset || [],
      rowsAffected: result.rowsAffected || [],
    };
  };

  return async (message) => {
    if (message.type === "exec") {
      const command = String(message.sql || "").trim().toUpperCase();

      if (command.startsWith("BEGIN")) {
        if (activeTransaction) {
          return null;
        }

        const pool = await getPool();
        activeTransaction = new sql.Transaction(pool);
        await activeTransaction.begin();
        return null;
      }

      if (command.startsWith("COMMIT")) {
        if (activeTransaction) {
          await activeTransaction.commit();
          activeTransaction = null;
        }

        return null;
      }

      if (command.startsWith("ROLLBACK")) {
        if (activeTransaction) {
          await activeTransaction.rollback();
          activeTransaction = null;
        }

        return null;
      }

      const pool = await getPool();
      const transformed = withQualifiedTables(message.sql, config.schema || "omds");
      const request = createRequest(pool, activeTransaction);
      await request.batch(transformed);
      return null;
    }

    if (message.type === "query") {
      return executeQuery(message.sql, Array.isArray(message.params) ? message.params : []);
    }

    throw new Error(`Unsupported sqlserver worker message type: ${message.type}`);
  };
};
