import type { AuthRole } from "./authData";

export type AuthMode = "external";

export type ExternalAuthIdentity = {
  email?: string;
  name?: string;
  role?: AuthRole;
  username: string;
};

type ExternalAuthConfiguration = {
  allowListUrlTemplate: string;
  emailFallbackDomain: string;
  loginUrl: string;
  timeoutMs: number;
};

const DEFAULT_EXTERNAL_AUTH_LOGIN_URL =
  "http://180.10.1.222:3002/authenticate/login";
const DEFAULT_OMARI_ALLOWLIST_URL_TEMPLATE =
  "http://172.16.3.21:3003/get/users/{username}";
const DEFAULT_EXTERNAL_AUTH_TIMEOUT_MS = 8000;
const DEFAULT_EXTERNAL_EMAIL_DOMAIN = "ad.omari.local";
const USERNAME_KEYS = [
  "username",
  "userName",
  "userid",
  "userId",
  "staff_id",
  "stuff_id",
  "samAccountName",
  "accountName",
  "account",
  "login",
  "uid",
  "user",
] as const;
const NAME_KEYS = [
  "name",
  "displayName",
  "fullName",
  "fullname",
  "full_name",
  "employeeName",
  "display_name",
] as const;
const EMAIL_KEYS = [
  "email",
  "mail",
  "emailAddress",
  "userPrincipalName",
  "upn",
] as const;
const ROLE_KEYS = ["role", "userRole", "accessRole"] as const;
const comparableKeySet = new Set(
  [...USERNAME_KEYS, ...NAME_KEYS, ...EMAIL_KEYS, ...ROLE_KEYS].map((key) =>
    key.toLowerCase()
  )
);

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeIdentifier = (value: unknown) => normalizeString(value).toLowerCase();

const normalizeDomain = (value: unknown) => {
  const normalized = normalizeString(value).toLowerCase().replace(/^@+/, "");
  return normalized || DEFAULT_EXTERNAL_EMAIL_DOMAIN;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const normalizeComparableValue = (value: unknown) => {
  const normalized = normalizeIdentifier(value);

  if (!normalized) {
    return "";
  }

  return normalized.replace(/^.*[\\\/]/, "");
};

const toCanonicalUsername = (value: unknown) => {
  const normalized = normalizeComparableValue(value);

  if (!normalized) {
    return "";
  }

  if (normalized.includes("@")) {
    return normalized.split("@")[0] || "";
  }

  return normalized;
};

const matchesIdentifier = (value: unknown, identifier: string) => {
  const comparableValue = normalizeComparableValue(value);

  if (!comparableValue) {
    return false;
  }

  if (comparableValue === identifier) {
    return true;
  }

  if (toCanonicalUsername(comparableValue) === identifier) {
    return true;
  }

  if (identifier.includes("@")) {
    return comparableValue === identifier || toCanonicalUsername(identifier) === comparableValue;
  }

  return false;
};

const getStringFieldFromRecord = (
  record: Record<string, unknown>,
  keys: readonly string[]
) => {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));

  for (const [key, value] of Object.entries(record)) {
    if (!normalizedKeys.has(key.toLowerCase())) {
      continue;
    }

    const normalized = normalizeString(value);

    if (normalized) {
      return normalized;
    }
  }

  return undefined;
};

const findMatchingRecord = (
  payload: unknown,
  identifier: string
): Record<string, unknown> | undefined => {
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const match = findMatchingRecord(item, identifier);

      if (match) {
        return match;
      }
    }

    return undefined;
  }

  if (!isPlainRecord(payload)) {
    return undefined;
  }

  for (const [key, value] of Object.entries(payload)) {
    if (
      (comparableKeySet.has(key.toLowerCase()) || typeof value === "string") &&
      matchesIdentifier(value, identifier)
    ) {
      return payload;
    }
  }

  for (const value of Object.values(payload)) {
    const match = findMatchingRecord(value, identifier);

    if (match) {
      return match;
    }
  }

  return undefined;
};

const payloadIncludesIdentifier = (payload: unknown, identifier: string): boolean => {
  if (Array.isArray(payload)) {
    return payload.some((item) => payloadIncludesIdentifier(item, identifier));
  }

  if (isPlainRecord(payload)) {
    return Object.values(payload).some((value) =>
      payloadIncludesIdentifier(value, identifier)
    );
  }

  return matchesIdentifier(payload, identifier);
};

const getPayloadRootRecord = (payload: unknown) => {
  return isPlainRecord(payload) ? payload : undefined;
};

const getResponsePayload = async (response: Response) => {
  const bodyText = await response.text();

  if (!bodyText.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    return bodyText;
  }
};

const resolveTimeoutMs = () => {
  const configuredTimeout = Number(process.env.EXTERNAL_AUTH_TIMEOUT_MS);

  if (Number.isInteger(configuredTimeout) && configuredTimeout > 0) {
    return configuredTimeout;
  }

  return DEFAULT_EXTERNAL_AUTH_TIMEOUT_MS;
};

const getExternalAuthConfiguration = (): ExternalAuthConfiguration => ({
  allowListUrlTemplate:
    normalizeString(process.env.OMARI_ALLOWLIST_URL_TEMPLATE) ||
    DEFAULT_OMARI_ALLOWLIST_URL_TEMPLATE,
  emailFallbackDomain: normalizeDomain(process.env.EXTERNAL_AUTH_EMAIL_DOMAIN),
  loginUrl:
    normalizeString(process.env.EXTERNAL_AUTH_LOGIN_URL) ||
    DEFAULT_EXTERNAL_AUTH_LOGIN_URL,
  timeoutMs: resolveTimeoutMs(),
});

const fetchWithTimeout = async (
  input: string,
  init: RequestInit,
  timeoutMs: number
) => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const isSuccessResponse = (payload: unknown) => {
  if (!isPlainRecord(payload)) {
    return false;
  }

  if (payload.success === true || payload.authenticated === true) {
    return true;
  }

  return normalizeIdentifier(payload.status) === "success";
};

const buildAllowListUrl = (template: string, username: string) => {
  return template.includes("{username}")
    ? template.replace("{username}", encodeURIComponent(username))
    : `${template.replace(/\/+$/, "")}/${encodeURIComponent(username)}`;
};

const normalizeRole = (value: unknown): AuthRole | undefined => {
  const normalized = normalizeIdentifier(value).replace(/[\s-]+/g, "_").toUpperCase();

  if (normalized === "SUPER_ADMIN" || normalized === "ADMIN") {
    return normalized as AuthRole;
  }

  if (normalized === "USER" || normalized === "VIEWER") {
    return normalized as AuthRole;
  }

  return undefined;
};

const buildFallbackEmail = (username: string, emailFallbackDomain: string) =>
  `${username}@${emailFallbackDomain}`;

const buildExternalIdentity = (
  requestedIdentifier: string,
  authPayload: unknown,
  allowListPayload: unknown,
  allowListRecord: Record<string, unknown> | undefined,
  config: ExternalAuthConfiguration
): ExternalAuthIdentity => {
  const authRecord =
    findMatchingRecord(authPayload, requestedIdentifier) ?? getPayloadRootRecord(authPayload);
  const rootAllowListRecord = getPayloadRootRecord(allowListPayload);
  const username =
    toCanonicalUsername(getStringFieldFromRecord(allowListRecord ?? {}, USERNAME_KEYS)) ||
    toCanonicalUsername(getStringFieldFromRecord(authRecord ?? {}, USERNAME_KEYS)) ||
    toCanonicalUsername(getStringFieldFromRecord(rootAllowListRecord ?? {}, USERNAME_KEYS)) ||
    toCanonicalUsername(getStringFieldFromRecord(getPayloadRootRecord(authPayload) ?? {}, USERNAME_KEYS)) ||
    toCanonicalUsername(requestedIdentifier);
  const emailCandidate =
    normalizeIdentifier(getStringFieldFromRecord(allowListRecord ?? {}, EMAIL_KEYS)) ||
    normalizeIdentifier(getStringFieldFromRecord(authRecord ?? {}, EMAIL_KEYS)) ||
    normalizeIdentifier(getStringFieldFromRecord(rootAllowListRecord ?? {}, EMAIL_KEYS)) ||
    normalizeIdentifier(getStringFieldFromRecord(getPayloadRootRecord(authPayload) ?? {}, EMAIL_KEYS)) ||
    (isValidEmail(requestedIdentifier) ? requestedIdentifier : "");
  const displayName =
    normalizeString(getStringFieldFromRecord(allowListRecord ?? {}, NAME_KEYS)) ||
    normalizeString(getStringFieldFromRecord(authRecord ?? {}, NAME_KEYS)) ||
    normalizeString(getStringFieldFromRecord(rootAllowListRecord ?? {}, NAME_KEYS)) ||
    normalizeString(getStringFieldFromRecord(getPayloadRootRecord(authPayload) ?? {}, NAME_KEYS)) ||
    username;
  const role =
    normalizeRole(getStringFieldFromRecord(allowListRecord ?? {}, ROLE_KEYS)) ||
    normalizeRole(getStringFieldFromRecord(authRecord ?? {}, ROLE_KEYS)) ||
    normalizeRole(getStringFieldFromRecord(rootAllowListRecord ?? {}, ROLE_KEYS));

  return {
    username,
    name: displayName || username,
    email: isValidEmail(emailCandidate)
      ? emailCandidate
      : buildFallbackEmail(username, config.emailFallbackDomain),
    role,
  };
};

export const resolveAuthMode = (): AuthMode => "external";

export const getAuthProviderLabel = () =>
  "DA Gateway + Omari allow list";

export const assertExternalAuthConfiguration = () => {
  const config = getExternalAuthConfiguration();

  // Validate URLs early so startup fails before users hit login.
  new URL(config.loginUrl);
  new URL(buildAllowListUrl(config.allowListUrlTemplate, "healthcheck"));
};

export const loginWithExternalAuth = async (payload: {
  password?: string;
  username?: string;
}): Promise<ExternalAuthIdentity> => {
  const identifier = normalizeIdentifier(payload.username);
  const password =
    typeof payload.password === "string" ? payload.password.trim() : "";

  if (!identifier || !password) {
    throw new Error("Username and password are required");
  }

  const config = getExternalAuthConfiguration();

  let authResponse: Response;

  try {
    authResponse = await fetchWithTimeout(
      config.loginUrl,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            username: identifier,
            password,
          },
        }),
      },
      config.timeoutMs
    );
  } catch {
    throw new Error("External directory authentication is unavailable");
  }

  const authPayload = await getResponsePayload(authResponse);

  if (!authResponse.ok) {
    if (authResponse.status === 401 || authResponse.status === 403) {
      throw new Error("Invalid username or password");
    }

    throw new Error("External directory authentication is unavailable");
  }

  if (!isSuccessResponse(authPayload)) {
    throw new Error("Invalid username or password");
  }

  const directoryUsername =
    toCanonicalUsername(
      getStringFieldFromRecord(
        findMatchingRecord(authPayload, identifier) ?? getPayloadRootRecord(authPayload) ?? {},
        USERNAME_KEYS
      )
    ) || toCanonicalUsername(identifier);
  const allowListUrl = buildAllowListUrl(
    config.allowListUrlTemplate,
    directoryUsername
  );

  let allowListResponse: Response;

  try {
    allowListResponse = await fetchWithTimeout(
      allowListUrl,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      },
      config.timeoutMs
    );
  } catch {
    throw new Error("Omari allow-list service is unavailable");
  }

  const allowListPayload = await getResponsePayload(allowListResponse);

  if (!allowListResponse.ok) {
    if (allowListResponse.status === 401 || allowListResponse.status === 403) {
      throw new Error("You are not on the Omari allow list");
    }

    if (allowListResponse.status === 404) {
      throw new Error("You are not on the Omari allow list");
    }

    throw new Error("Omari allow-list service is unavailable");
  }

  const allowListRecord =
    findMatchingRecord(allowListPayload, directoryUsername) ??
    findMatchingRecord(allowListPayload, identifier);

  if (!allowListRecord && !payloadIncludesIdentifier(allowListPayload, directoryUsername)) {
    throw new Error("You are not on the Omari allow list");
  }

  return buildExternalIdentity(
    directoryUsername || identifier,
    authPayload,
    allowListPayload,
    allowListRecord,
    config
  );
};
