import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { clearCredentials } from "./authSlice";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "USER" | "VIEWER";

export interface AuthUser {
  userId: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  status: "Active" | "Disabled";
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface AuthResponse {
  expiresIn: number;
  user: AuthUser;
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterInitialUserRequest {
  username: string;
  name: string;
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthBootstrapStatus {
  userCount: number;
  requiresSetup: boolean;
}

export interface CreateUserRequest {
  username: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export type User = AuthUser;

export interface OperationsOverview {
  receiptsThisMonth: number;
  totalReceivedValue: number;
  hqUnitsOnHand: number;
  serializedUnits: number;
  pendingIssues: number;
  activeSuppliers: number;
  documentExceptions: number;
  documentsPendingReview: number;
  missingDocumentItems: number;
  documentQueueTotal: number;
  lowStockItems: number;
  acknowledgedIssues: number;
  returnedIssues: number;
  branchIssues: number;
  activeBranches: number;
  branchesWithIssuedAssets: number;
  recentReceipts: ReceivingReceipt[];
  issueOutQueue: IssueRecord[];
  supplierHighlights: Supplier[];
  stockWatchlist: HqStockItem[];
  documentQueue: DocumentQueueEntry[];
  recentActivity: AuditActivity[];
  auditAlerts: AuditAlert[];
}

export interface DocumentQueueEntry {
  queueId: string;
  entityType: "Receipt" | "Issue";
  referenceId: string;
  title: string;
  owner: string;
  date: string;
  documentStatus: string;
  documentCount: number;
  reason: string;
}

export interface AuditActivity {
  activityId: string;
  activityType:
    | "Receipt Logged"
    | "Issue Out"
    | "Issue Acknowledged"
    | "Issue Returned";
  occurredOn: string;
  actor: string;
  referenceId: string;
  detail: string;
  status: string;
}

export interface AuditAlert {
  alertId: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  referenceType: "receipt" | "issue" | "stock";
  referenceId: string;
}

export interface ReceivingReceipt {
  receiptId: string;
  receiptType: "Batch" | "Single Item";
  supplierId: string;
  supplierName: string;
  arrivalDate: string;
  signedBy: string;
  receivedBy: string;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  documentCount: number;
  documentStatus: "Complete" | "Pending Review" | "Missing";
  status: "Verified" | "Pending Review" | "Logged";
  attachmentNames: string[];
  attachments: ReceiptAttachment[];
}

export interface ReceiptAttachment {
  attachmentId: string;
  receiptId: string;
  originalName: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  downloadUrl: string;
}

export interface ReceivingReceiptLine {
  lineId: string;
  receiptId: string;
  lineNumber: number;
  itemName: string;
  category: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  storageLocation: string;
  isSerialized: boolean;
  serialNumbers: string[];
}

export interface ReceivingReceiptDetail extends ReceivingReceipt {
  lines: ReceivingReceiptLine[];
}

export interface ReceivingKnownItem {
  itemName: string;
  category: string;
  defaultStorageLocation: string;
  supplierName: string;
  isSerialized: boolean;
}

export interface ReceivingOptions {
  suppliers: Supplier[];
  stockLocations: string[];
  knownItems: ReceivingKnownItem[];
  receivedBySuggestions: string[];
  signedBySuggestions: string[];
}

export interface NewReceivingReceiptLine {
  itemName: string;
  category: string;
  quantity: number;
  unitCost: number;
  storageLocation: string;
  isSerialized: boolean;
  serialNumbers?: string[];
}

export interface NewReceivingReceipt {
  receiptType: "Batch" | "Single Item";
  supplierId: string;
  arrivalDate: string;
  signedBy: string;
  receivedBy: string;
  documentStatus?: "Pending Review" | "Missing";
  lines: NewReceivingReceiptLine[];
}

export interface HqStockItem {
  stockId: string;
  itemName: string;
  category: string;
  totalQuantity: number;
  serializedUnits: number;
  nonSerializedUnits: number;
  supplierName: string;
  lastArrivalDate: string;
  storageLocation: string;
  locationCount: number;
  storageLocations: string[];
  status: "Available" | "Reserved" | "Low Stock";
}

export interface StockLocationBalance {
  balanceId: string;
  stockId: string;
  storageLocation: string;
  totalQuantity: number;
  serializedUnits: number;
  nonSerializedUnits: number;
  lastMovementDate: string;
}

export interface StockMovementRecord {
  movementId: string;
  stockId: string;
  itemName: string;
  movementType: "Receipt" | "Issue Out" | "Return" | "Adjustment";
  quantityDelta: number;
  movementDate: string;
  referenceType: string;
  referenceId: string;
  storageLocation?: string;
  serialNumbers: string[];
  notes?: string;
}

export interface HqStockItemDetail extends HqStockItem {
  availableSerialCount: number;
  issuedSerialCount: number;
  locationBalances: StockLocationBalance[];
  recentMovements: StockMovementRecord[];
  availableSerialAssets: SerialAsset[];
}

export interface SerialAsset {
  assetId: string;
  stockId: string;
  itemName: string;
  serialNumber: string;
  supplierName: string;
  lastArrivalDate: string;
  storageLocation: string;
  status: "Available" | "Issued";
  issueId?: string;
}

export interface IssueAttachment {
  attachmentId: string;
  issueId: string;
  originalName: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  downloadUrl: string;
}

export interface Branch {
  branchId: string;
  name: string;
  code: string;
  address: string;
  region: string;
  contactPerson: string;
  phone: string;
  status: "Active" | "Inactive";
}

export interface IssueRecord {
  issueId: string;
  itemName: string;
  serialNumber: string;
  destinationType: "Branch" | "Person";
  branchId?: string;
  issuedTo: string;
  issuedBy: string;
  address: string;
  issueDate: string;
  attachmentNames: string[];
  attachments: IssueAttachment[];
  notes?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  acknowledgementNotes?: string;
  returnedBy?: string;
  returnedAt?: string;
  returnNotes?: string;
  status: "Issued" | "Acknowledged" | "Returned";
}

export interface NewIssueRecord {
  itemName: string;
  serialNumber: string;
  destinationType: "Branch" | "Person";
  branchId?: string;
  issuedTo: string;
  issuedBy: string;
  address: string;
  issueDate: string;
  attachmentNames?: string[];
  notes?: string;
}

export interface AcknowledgeIssuePayload {
  acknowledgedBy: string;
  acknowledgedAt?: string;
  acknowledgementNotes?: string;
}

export interface ReturnIssuePayload {
  returnedBy: string;
  returnedAt?: string;
  returnNotes?: string;
}

export type CreateIssueRecordPayload = FormData | NewIssueRecord;

export interface Supplier {
  supplierId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  categoryFocus: string;
  lastDeliveryDate: string;
  activeContracts: number;
}

const resolveApiBaseUrl = (baseUrl: string | undefined) => {
  const normalizedBaseUrl = (baseUrl || "http://localhost:3001").replace(
    /\/+$/,
    ""
  );

  return `${normalizedBaseUrl}/api`;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
  credentials: "include",
});

const baseQueryWithAuthHandling: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  const requestUrl = typeof args === "string" ? args : args.url;

  if (result.error?.status === 401) {
    if (requestUrl !== "/auth/logout") {
      await rawBaseQuery(
        {
          url: "/auth/logout",
          method: "POST",
        },
        api,
        extraOptions
      );
    }

    api.dispatch(clearCredentials());
  }

  return result;
};

export const api = createApi({
  baseQuery: baseQueryWithAuthHandling,
  reducerPath: "api",
  tagTypes: [
    "AuthBootstrapStatus",
    "Users",
    "OperationsOverview",
    "ReceivingReceipts",
    "ReceivingOptions",
    "HqStock",
    "SerialAssets",
    "Transfers",
    "Branches",
    "Suppliers",
  ],
  endpoints: (build) => ({
    getAuthBootstrapStatus: build.query<AuthBootstrapStatus, void>({
      query: () => "/auth/bootstrap-status",
      providesTags: ["AuthBootstrapStatus"],
    }),
    registerInitialUser: build.mutation<AuthResponse, RegisterInitialUserRequest>({
      query: (payload) => ({
        url: "/auth/register",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["AuthBootstrapStatus", "Users"],
    }),
    login: build.mutation<AuthResponse, LoginRequest>({
      query: (payload) => ({
        url: "/auth/login",
        method: "POST",
        body: payload,
      }),
    }),
    logout: build.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
    getCurrentUser: build.query<AuthUser, void>({
      query: () => "/auth/me",
    }),
    getOperationsOverview: build.query<OperationsOverview, void>({
      query: () => "/operations/overview",
      providesTags: ["OperationsOverview"],
    }),
    getReceivingReceipts: build.query<ReceivingReceipt[], void>({
      query: () => "/operations/receipts",
      providesTags: ["ReceivingReceipts"],
    }),
    getReceivingOptions: build.query<ReceivingOptions, void>({
      query: () => "/operations/receiving-options",
      providesTags: ["ReceivingOptions"],
    }),
    createReceivingReceipt: build.mutation<
      ReceivingReceiptDetail,
      FormData | NewReceivingReceipt
    >({
      query: (newReceipt) => ({
        url: "/operations/receipts",
        method: "POST",
        body: newReceipt,
      }),
      invalidatesTags: [
        "ReceivingReceipts",
        "ReceivingOptions",
        "HqStock",
        "OperationsOverview",
        "SerialAssets",
      ],
    }),
    addReceivingReceiptAttachments: build.mutation<
      ReceivingReceiptDetail,
      { receiptId: string; payload: FormData }
    >({
      query: ({ receiptId, payload }) => ({
        url: `/operations/receipts/${receiptId}/attachments`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["ReceivingReceipts", "OperationsOverview"],
    }),
    verifyReceivingReceipt: build.mutation<ReceivingReceiptDetail, string>({
      query: (receiptId) => ({
        url: `/operations/receipts/${receiptId}/verify`,
        method: "POST",
      }),
      invalidatesTags: ["ReceivingReceipts", "OperationsOverview"],
    }),
    getHqStock: build.query<HqStockItem[], void>({
      query: () => "/operations/stock",
      providesTags: ["HqStock"],
    }),
    getHqStockDetail: build.query<HqStockItemDetail, string>({
      query: (stockId) => `/operations/stock/${stockId}`,
      providesTags: ["HqStock"],
    }),
    getAvailableSerialAssets: build.query<SerialAsset[], string | void>({
      query: (itemName) => ({
        url: "/operations/serial-assets",
        params: itemName ? { itemName } : {},
      }),
      providesTags: ["SerialAssets"],
    }),
    getBranches: build.query<Branch[], void>({
      query: () => "/operations/branches",
      providesTags: ["Branches"],
    }),
    getIssueRecords: build.query<IssueRecord[], void>({
      query: () => "/operations/issues",
      providesTags: ["Transfers"],
    }),
    createIssueRecord: build.mutation<IssueRecord, CreateIssueRecordPayload>({
      query: (newIssueRecord) => ({
        url: "/operations/issues",
        method: "POST",
        body: newIssueRecord,
      }),
      invalidatesTags: [
        "Transfers",
        "HqStock",
        "OperationsOverview",
        "SerialAssets",
      ],
    }),
    acknowledgeIssueRecord: build.mutation<
      IssueRecord,
      { issueId: string; payload: AcknowledgeIssuePayload }
    >({
      query: ({ issueId, payload }) => ({
        url: `/operations/issues/${issueId}/acknowledge`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Transfers", "OperationsOverview"],
    }),
    returnIssueRecord: build.mutation<
      IssueRecord,
      { issueId: string; payload: ReturnIssuePayload }
    >({
      query: ({ issueId, payload }) => ({
        url: `/operations/issues/${issueId}/return`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [
        "Transfers",
        "HqStock",
        "OperationsOverview",
        "SerialAssets",
      ],
    }),
    getSuppliers: build.query<Supplier[], void>({
      query: () => "/operations/suppliers",
      providesTags: ["Suppliers"],
    }),
    getUsers: build.query<User[], void>({
      query: () => "/users",
      providesTags: ["Users"],
    }),
    createUser: build.mutation<User, CreateUserRequest>({
      query: (payload) => ({
        url: "/users",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Users"],
    }),
  }),
});

export const {
  useGetAuthBootstrapStatusQuery,
  useRegisterInitialUserMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useGetOperationsOverviewQuery,
  useGetReceivingReceiptsQuery,
  useGetReceivingOptionsQuery,
  useCreateReceivingReceiptMutation,
  useAddReceivingReceiptAttachmentsMutation,
  useVerifyReceivingReceiptMutation,
  useGetHqStockQuery,
  useGetHqStockDetailQuery,
  useGetAvailableSerialAssetsQuery,
  useGetBranchesQuery,
  useGetIssueRecordsQuery,
  useCreateIssueRecordMutation,
  useAcknowledgeIssueRecordMutation,
  useReturnIssueRecordMutation,
  useGetSuppliersQuery,
  useGetUsersQuery,
  useCreateUserMutation,
} = api;
