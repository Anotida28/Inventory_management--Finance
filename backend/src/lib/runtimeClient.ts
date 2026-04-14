import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import type {
  AuthResponse,
  AuthUser,
  CreateUserRequest,
  LoginRequest,
  RegisterRequest,
} from "./authData";
import type {
  NewReceivingReceipt,
  ReceiptAttachment,
  ReceivingOptions,
  ReceivingReceipt,
  ReceivingReceiptDetail,
} from "./receivingData";

type WorkerRequest = {
  id: number;
  method: string;
  args: unknown[];
};

type WorkerResponse = {
  id: number;
  result?: unknown;
  error?: {
    message: string;
    stack?: string;
  };
};

type PendingRequest = {
  reject: (error: Error) => void;
  resolve: (value: unknown) => void;
};

type RuntimeWorker = {
  pending: Map<number, PendingRequest>;
  worker: Worker;
};

const resolveWorkerCount = () => {
  const configuredCount = Number(process.env.API_WORKER_COUNT);

  if (Number.isInteger(configuredCount) && configuredCount > 0) {
    return configuredCount;
  }

  return Math.max(1, Math.min(os.cpus().length || 1, 4));
};

class RuntimeWorkerPool {
  private nextRequestId = 1;
  private nextWorkerIndex = 0;
  private readonly workerCount = resolveWorkerCount();
  private readonly workers: RuntimeWorker[] = [];

  constructor() {
    for (let index = 0; index < this.workerCount; index += 1) {
      this.workers.push(this.createWorker());
    }
  }

  private createWorker(): RuntimeWorker {
    const workerScriptPath = path.resolve(__dirname, "../../scripts/runtimeWorker.js");
    const worker = new Worker(workerScriptPath);
    const runtimeWorker: RuntimeWorker = {
      worker,
      pending: new Map<number, PendingRequest>(),
    };

    worker.on("message", (message: WorkerResponse) => {
      const pendingRequest = runtimeWorker.pending.get(message.id);

      if (!pendingRequest) {
        return;
      }

      runtimeWorker.pending.delete(message.id);

      if (message.error) {
        const error = new Error(message.error.message);

        if (message.error.stack) {
          error.stack = message.error.stack;
        }

        pendingRequest.reject(error);
        return;
      }

      pendingRequest.resolve(message.result);
    });

    worker.on("error", (error) => {
      runtimeWorker.pending.forEach((pendingRequest) => pendingRequest.reject(error));
      runtimeWorker.pending.clear();
    });

    worker.on("exit", (code) => {
      if (code === 0) {
        return;
      }

      const error = new Error(`Runtime worker exited with code ${code}`);
      runtimeWorker.pending.forEach((pendingRequest) => pendingRequest.reject(error));
      runtimeWorker.pending.clear();
    });

    return runtimeWorker;
  }

  call<T>(method: string, ...args: unknown[]): Promise<T> {
    const requestId = this.nextRequestId++;
    const selectedWorker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;

    return new Promise<T>((resolve, reject) => {
      selectedWorker.pending.set(requestId, {
        reject,
        resolve: (value) => resolve(value as T),
      });

      const payload: WorkerRequest = {
        id: requestId,
        method,
        args,
      };

      selectedWorker.worker.postMessage(payload);
    });
  }
}

const runtimeWorkerPool = new RuntimeWorkerPool();

export const backendRuntime = {
  auth: {
    authenticateToken: (token: string) =>
      runtimeWorkerPool.call<AuthUser>("auth.authenticateToken", token),
    getAuthBootstrapStatus: () =>
      runtimeWorkerPool.call<{ requiresSetup: boolean; userCount: number }>(
        "auth.getAuthBootstrapStatus"
      ),
    getUserById: (userId: string) =>
      runtimeWorkerPool.call<AuthUser | undefined>("auth.getUserById", userId),
    loginUser: (payload: LoginRequest) =>
      runtimeWorkerPool.call<AuthResponse>("auth.loginUser", payload),
    registerInitialUser: (payload: RegisterRequest) =>
      runtimeWorkerPool.call<AuthResponse>("auth.registerInitialUser", payload),
  },
  users: {
    createUser: (payload: CreateUserRequest, actor: AuthUser) =>
      runtimeWorkerPool.call<AuthUser>("users.createUser", payload, actor),
    getUsers: () => runtimeWorkerPool.call<AuthUser[]>("users.getUsers"),
  },
  operations: {
    acknowledgeIssueRecord: (issueId: string, payload: Record<string, unknown>) =>
      runtimeWorkerPool.call("operations.acknowledgeIssueRecord", issueId, payload),
    createIssueRecord: (
      payload: Record<string, unknown>,
      uploadedAttachments?: unknown[]
    ) =>
      runtimeWorkerPool.call(
        "operations.createIssueRecord",
        payload,
        uploadedAttachments ?? []
      ),
    getAvailableSerialAssets: (itemName?: string) =>
      runtimeWorkerPool.call("operations.getAvailableSerialAssets", itemName),
    getBranches: () => runtimeWorkerPool.call("operations.getBranches"),
    getHqStock: () => runtimeWorkerPool.call("operations.getHqStock"),
    getHqStockDetail: (stockId: string) =>
      runtimeWorkerPool.call("operations.getHqStockDetail", stockId),
    getIssueRecords: () => runtimeWorkerPool.call("operations.getIssueRecords"),
    getOperationAttachmentById: (attachmentId: string) =>
      runtimeWorkerPool.call<ReceiptAttachment | null>(
        "receiving.getOperationAttachmentById",
        attachmentId
      ),
    getOperationsOverview: () =>
      runtimeWorkerPool.call("operations.getOperationsOverview"),
    getSuppliers: () => runtimeWorkerPool.call("operations.getSuppliers"),
    returnIssueRecord: (issueId: string, payload: Record<string, unknown>) =>
      runtimeWorkerPool.call("operations.returnIssueRecord", issueId, payload),
  },
  receiving: {
    addReceiptAttachments: (receiptId: string, uploadedAttachments: unknown[]) =>
      runtimeWorkerPool.call<ReceivingReceiptDetail>(
        "receiving.addReceiptAttachments",
        receiptId,
        uploadedAttachments
      ),
    createReceipt: (
      payload: NewReceivingReceipt,
      uploadedAttachments: unknown[] = []
    ) =>
      runtimeWorkerPool.call<ReceivingReceiptDetail>(
        "receiving.createReceipt",
        payload,
        uploadedAttachments
      ),
    getOperationAttachmentById: (attachmentId: string) =>
      runtimeWorkerPool.call<ReceiptAttachment | null>(
        "receiving.getOperationAttachmentById",
        attachmentId
      ),
    getReceivingOptions: () =>
      runtimeWorkerPool.call<ReceivingOptions>("receiving.getReceivingOptions"),
    getReceivingReceiptById: (receiptId: string) =>
      runtimeWorkerPool.call<ReceivingReceiptDetail | null>(
        "receiving.getReceivingReceiptById",
        receiptId
      ),
    getReceivingReceipts: () =>
      runtimeWorkerPool.call<ReceivingReceipt[]>("receiving.getReceivingReceipts"),
    verifyReceipt: (receiptId: string) =>
      runtimeWorkerPool.call<ReceivingReceiptDetail>(
        "receiving.verifyReceipt",
        receiptId
      ),
  },
};
