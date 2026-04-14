import { db } from "./database";

type TableRequirement = {
  requiredColumns?: string[];
  tableName: string;
};

const BOOTSTRAP_COMMAND = "npm run db:bootstrap";

export const runtimeSchemaMutationsEnabled = () =>
  process.env.ALLOW_RUNTIME_SCHEMA_MUTATIONS === "true";

export const assertSchemaReady = (
  featureName: string,
  tableRequirements: TableRequirement[]
) => {
  const missingDetails = tableRequirements.flatMap((tableRequirement) => {
    const tableColumns = db.getTableColumns(tableRequirement.tableName);

    if (tableColumns.length === 0) {
      return [`missing table ${tableRequirement.tableName}`];
    }

    const requiredColumns = tableRequirement.requiredColumns ?? [];
    return requiredColumns
      .filter((columnName) => !tableColumns.includes(columnName))
      .map(
        (columnName) =>
          `missing column ${tableRequirement.tableName}.${columnName}`
      );
  });

  if (missingDetails.length === 0) {
    return;
  }

  throw new Error(
    `${featureName} schema is not ready (${missingDetails.join(
      ", "
    )}). Run ${BOOTSTRAP_COMMAND} before starting the API.`
  );
};
