import { NewReceivingReceiptLine, ReceivingKnownItem } from "@/services/api";

export type BatchReceiptPreviewRow = {
  rowNumber: number;
  itemName: string;
  category: string;
  quantity: number;
  unitCost: number;
  storageLocation: string;
  isSerialized: boolean;
  serialNumbers: string[];
  issues: string[];
  line: NewReceivingReceiptLine | null;
};

export type BatchReceiptPreview = {
  fileName: string;
  headerIssues: string[];
  rows: BatchReceiptPreviewRow[];
};

const expectedHeaders = [
  "itemName",
  "category",
  "quantity",
  "unitCost",
  "storageLocation",
  "isSerialized",
  "serialNumbers",
] as const;

const normalizeHeader = (value: string) =>
  value.replace(/[\s_-]+/g, "").toLowerCase();

const parseCsvText = (value: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (inQuotes) {
      if (character === '"') {
        if (value[index + 1] === '"') {
          currentCell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += character;
      }

      continue;
    }

    if (character === '"') {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (character === "\r") {
      if (value[index + 1] === "\n") {
        continue;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    if (character === "\n") {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  currentRow.push(currentCell);

  if (currentRow.some((cell) => cell.trim() !== "")) {
    rows.push(currentRow);
  }

  return {
    rows,
    hasUnclosedQuotes: inQuotes,
  };
};

const parseSerializedFlag = (
  value: string,
  knownItem: ReceivingKnownItem | undefined
) => {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) {
    return {
      parsedValue: knownItem?.isSerialized ?? false,
      issue: null,
    };
  }

  if (
    ["true", "yes", "y", "1", "serialized"].includes(normalizedValue)
  ) {
    return {
      parsedValue: true,
      issue: null,
    };
  }

  if (["false", "no", "n", "0", "bulk"].includes(normalizedValue)) {
    return {
      parsedValue: false,
      issue: null,
    };
  }

  return {
    parsedValue: knownItem?.isSerialized ?? false,
    issue: "isSerialized must be yes/no, true/false, 1/0, serialized, or bulk",
  };
};

const parseSerialNumbers = (value: string) =>
  value
    .split(/[|,\n]+/)
    .map((serialNumber) => serialNumber.trim())
    .filter(Boolean);

export const batchReceiptTemplateCsv = [
  expectedHeaders.join(","),
  [
    "Lenovo ThinkPad E14",
    "Laptop",
    "2",
    "950",
    "HQ Cage A1",
    "true",
    "LNV-E14-240201|LNV-E14-240202",
  ].join(","),
  [
    "Receipt Folders",
    "Stationery",
    "20",
    "4.50",
    "HQ Rack D1",
    "false",
    "",
  ].join(","),
].join("\n");

export const previewBatchReceiptFile = (
  fileName: string,
  fileContents: string,
  knownItems: ReceivingKnownItem[]
): BatchReceiptPreview => {
  const { rows, hasUnclosedQuotes } = parseCsvText(fileContents);
  const headerIssues: string[] = [];
  const knownItemsByName = new Map(
    knownItems.map((item) => [item.itemName.toLowerCase(), item])
  );

  if (hasUnclosedQuotes) {
    headerIssues.push("The CSV file has an unmatched quote.");
  }

  if (rows.length === 0) {
    headerIssues.push("The import file is empty.");

    return {
      fileName,
      headerIssues,
      rows: [],
    };
  }

  const headerRow = rows[0].map((cell) => cell.trim());
  const normalizedHeaderRow = headerRow.map(normalizeHeader);

  expectedHeaders.forEach((expectedHeader, index) => {
    if (normalizedHeaderRow[index] !== normalizeHeader(expectedHeader)) {
      headerIssues.push(
        `Column ${index + 1} must be "${expectedHeader}" (found "${
          headerRow[index] || "blank"
        }").`
      );
    }
  });

  if (rows.length === 1) {
    headerIssues.push("The import file does not contain any data rows.");
  }

  const previewRows = rows.slice(1).map((row, index) => {
    const [
      rawItemName = "",
      rawCategory = "",
      rawQuantity = "",
      rawUnitCost = "",
      rawStorageLocation = "",
      rawIsSerialized = "",
      rawSerialNumbers = "",
    ] = row;
    const itemName = rawItemName.trim();
    const knownItem = knownItemsByName.get(itemName.toLowerCase());
    const category = rawCategory.trim() || knownItem?.category || "";
    const storageLocation =
      rawStorageLocation.trim() || knownItem?.defaultStorageLocation || "";
    const quantity = Number(rawQuantity.trim());
    const unitCost = Number(rawUnitCost.trim());
    const serialNumbers = parseSerialNumbers(rawSerialNumbers);
    const { parsedValue: isSerialized, issue: serializedIssue } =
      parseSerializedFlag(rawIsSerialized, knownItem);
    const issues: string[] = [];

    if (!itemName) {
      issues.push("Item name is required");
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      issues.push("Quantity must be a whole number greater than 0");
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      issues.push("Unit cost must be 0 or greater");
    }

    if (!category) {
      issues.push("Category is required");
    }

    if (!storageLocation) {
      issues.push("Storage location is required");
    }

    if (serializedIssue) {
      issues.push(serializedIssue);
    }

    if (isSerialized && serialNumbers.length !== quantity) {
      issues.push(
        `Serialized rows need one serial number per unit (${serialNumbers.length} provided for ${quantity || 0} units)`
      );
    }

    if (!isSerialized && serialNumbers.length > 0) {
      issues.push("Non-serialized rows cannot include serial numbers");
    }

    if (new Set(serialNumbers).size !== serialNumbers.length) {
      issues.push("Serial numbers must be unique within the row");
    }

    return {
      rowNumber: index + 2,
      itemName,
      category,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      unitCost: Number.isFinite(unitCost) ? unitCost : 0,
      storageLocation,
      isSerialized,
      serialNumbers,
      issues,
      line:
        issues.length === 0
          ? {
              itemName,
              category,
              quantity,
              unitCost,
              storageLocation,
              isSerialized,
              serialNumbers,
            }
          : null,
    } satisfies BatchReceiptPreviewRow;
  });

  const duplicateSerialRows = new Map<string, number[]>();

  previewRows.forEach((row) => {
    row.serialNumbers.forEach((serialNumber) => {
      const serialRows = duplicateSerialRows.get(serialNumber.toLowerCase()) ?? [];
      serialRows.push(row.rowNumber);
      duplicateSerialRows.set(serialNumber.toLowerCase(), serialRows);
    });
  });

  previewRows.forEach((row) => {
    const duplicateSerials = row.serialNumbers.filter((serialNumber) => {
      const entries = duplicateSerialRows.get(serialNumber.toLowerCase()) ?? [];
      return entries.length > 1;
    });

    if (duplicateSerials.length > 0) {
      row.issues.push(
        `Serial number(s) repeated in the file: ${duplicateSerials.join(", ")}`
      );
      row.line = null;
    }
  });

  return {
    fileName,
    headerIssues,
    rows: previewRows,
  };
};
