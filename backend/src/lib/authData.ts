import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AUTH_TOKEN_TTL_SECONDS } from "./authConstants";
import { db, ensureIndex } from "./database";
import { assertSchemaReady, runtimeSchemaMutationsEnabled } from "./runtimeSchema";

const AUTH_TOKEN_TTL = `${AUTH_TOKEN_TTL_SECONDS}s`;
const allowedRoles = ["SUPER_ADMIN", "ADMIN", "USER", "VIEWER"] as const;

export type AuthRole = (typeof allowedRoles)[number];

type AuthUserRow = {
  userId: string;
  username: string;
  name: string;
  email: string;
  role: AuthRole;
  status: "Active" | "Disabled";
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  passwordHash: string;
};

export type AuthUser = Omit<AuthUserRow, "passwordHash" | "lastLogin"> & {
  lastLogin?: string;
};

export type CreateUserRequest = {
  username?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: AuthRole;
};

export type ExternalUserSyncRequest = {
  email?: string;
  name?: string;
  role?: AuthRole;
  username?: string;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthUser;
};

export type AuthTokenPayload = {
  sub: string;
  username: string;
  role: AuthRole;
  name: string;
  email: string;
  iat?: number;
  exp?: number;
};

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeIdentifier = (value: unknown) => normalizeString(value).toLowerCase();

const normalizeRole = (value: unknown): AuthRole | undefined => {
  const normalizedRole = normalizeString(value).toUpperCase();

  if (allowedRoles.includes(normalizedRole as AuthRole)) {
    return normalizedRole as AuthRole;
  }

  return undefined;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidUsername = (value: string) =>
  /^[a-z0-9._-]{3,32}$/i.test(value);

const getJwtSecret = () => {
  const jwtSecret = process.env.JWT_SECRET?.trim();

  if (!jwtSecret) {
    throw new Error("JWT_SECRET must be set before the server starts");
  }

  return jwtSecret;
};

const ensureAuthSchema = () => {
  if (runtimeSchemaMutationsEnabled()) {
    if (db.dialect === "sqlserver") {
      return;
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS auth_users (
        userId VARCHAR(64) PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'Active',
        createdAt VARCHAR(32) NOT NULL,
        updatedAt VARCHAR(32) NOT NULL,
        lastLogin VARCHAR(32) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    ensureIndex("auth_users", "idx_auth_users_username", ["username"]);
    ensureIndex("auth_users", "idx_auth_users_email", ["email"]);
  }

  assertSchemaReady("Authentication", [
    {
      tableName: "auth_users",
      requiredColumns: [
        "userId",
        "username",
        "name",
        "email",
        "passwordHash",
        "role",
        "status",
        "createdAt",
        "updatedAt",
        "lastLogin",
      ],
    },
  ]);
};

ensureAuthSchema();

const mapAuthUser = (row: Omit<AuthUserRow, "passwordHash">): AuthUser => ({
  userId: row.userId,
  username: row.username,
  name: row.name,
  email: row.email,
  role: row.role,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  lastLogin: row.lastLogin ?? undefined,
});

const getNextUserId = () => {
  const highestSequence = db.getNumericSuffixSequence("auth_users", "userId", 5);

  return `USR-${String(highestSequence + 1).padStart(3, "0")}`;
};

const getAuthUserRowById = (userId: string) => {
  return db
    .prepare(
      `
        SELECT
          userId,
          username,
          name,
          email,
          passwordHash,
          role,
          status,
          createdAt,
          updatedAt,
          lastLogin
        FROM auth_users
        WHERE userId = ?
      `
    )
    .get(userId) as AuthUserRow | undefined;
};

const getAuthUserRowByUsername = (username: string) => {
  return db
    .prepare(
      `
        SELECT
          userId,
          username,
          name,
          email,
          passwordHash,
          role,
          status,
          createdAt,
          updatedAt,
          lastLogin
        FROM auth_users
        WHERE username = ?
      `
    )
    .get(username) as AuthUserRow | undefined;
};

const getAuthUserRowByEmail = (email: string) => {
  return db
    .prepare(
      `
        SELECT
          userId,
          username,
          name,
          email,
          passwordHash,
          role,
          status,
          createdAt,
          updatedAt,
          lastLogin
        FROM auth_users
        WHERE email = ?
      `
    )
    .get(email) as AuthUserRow | undefined;
};

const getUserCount = () => {
  return db.prepare("SELECT COUNT(*) AS count FROM auth_users").get().count || 0;
};

const signAccessToken = (user: AuthUser) => {
  return jwt.sign(
    {
      sub: user.userId,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
    },
    getJwtSecret(),
    { expiresIn: AUTH_TOKEN_TTL }
  );
};

const buildAuthResponse = (user: AuthUser): AuthResponse => ({
  accessToken: signAccessToken(user),
  tokenType: "Bearer",
  expiresIn: AUTH_TOKEN_TTL_SECONDS,
  user,
});

const validateCommonUserFields = (payload: CreateUserRequest) => {
  const username = normalizeIdentifier(payload.username);
  const name = normalizeString(payload.name);
  const email = normalizeIdentifier(payload.email);
  const password =
    typeof payload.password === "string" ? payload.password.trim() : "";

  if (!username || !name || !email || !password) {
    throw new Error("Missing required user fields");
  }

  if (!isValidUsername(username)) {
    throw new Error(
      "Username must be 3-32 characters and only use letters, numbers, dots, underscores, or hyphens"
    );
  }

  if (!isValidEmail(email)) {
    throw new Error("A valid email address is required");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  return {
    username,
    name,
    email,
    password,
  };
};

const isEmailOwnedByAnotherUser = (email: string, userId: string) => {
  const existingUser = getAuthUserRowByEmail(email);
  return Boolean(existingUser && existingUser.userId !== userId);
};

const ensureUserIsUnique = (username: string, email: string) => {
  const duplicateByUsername = db
    .prepare("SELECT userId FROM auth_users WHERE username = ?")
    .get(username);

  if (duplicateByUsername) {
    throw new Error("Username is already in use");
  }

  const duplicateByEmail = db
    .prepare("SELECT userId FROM auth_users WHERE email = ?")
    .get(email);

  if (duplicateByEmail) {
    throw new Error("Email is already in use");
  }
};

export const getUserByIdData = (userId: string): AuthUser | undefined => {
  const row = getAuthUserRowById(userId);
  return row ? mapAuthUser(row) : undefined;
};

export const listUsersData = (): AuthUser[] => {
  const rows = db
    .prepare(
      `
        SELECT
          userId,
          username,
          name,
          email,
          role,
          status,
          createdAt,
          updatedAt,
          lastLogin
        FROM auth_users
        ORDER BY createdAt ASC, name ASC
      `
    )
    .all() as Array<Omit<AuthUserRow, "passwordHash">>;

  return rows.map(mapAuthUser);
};

export const createUserData = (
  payload: CreateUserRequest,
  actor: AuthUser
): AuthUser => {
  const { username, name, email, password } = validateCommonUserFields(payload);
  const requestedRole = normalizeRole(payload.role) ?? "USER";

  if (!["ADMIN", "SUPER_ADMIN"].includes(actor.role)) {
    throw new Error("Only administrators can create users");
  }

  if (requestedRole === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
    throw new Error("Only super administrators can create super administrators");
  }

  ensureUserIsUnique(username, email);

  const timestamp = new Date().toISOString();
  const createdUser: AuthUser = {
    userId: getNextUserId(),
    username,
    name,
    email,
    role: requestedRole,
    status: "Active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.prepare(
    `
      INSERT INTO auth_users (
        userId,
        username,
        name,
        email,
        passwordHash,
        role,
        status,
        createdAt,
        updatedAt,
        lastLogin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    createdUser.userId,
    createdUser.username,
    createdUser.name,
    createdUser.email,
    bcrypt.hashSync(password, 10),
    createdUser.role,
    createdUser.status,
    createdUser.createdAt,
    createdUser.updatedAt,
    null
  );

  return createdUser;
};

export const syncExternalUserData = (
  payload: ExternalUserSyncRequest
): AuthResponse => {
  const username = normalizeIdentifier(payload.username);

  if (!username || !isValidUsername(username)) {
    throw new Error("External authentication did not provide a valid username");
  }

  const timestamp = new Date().toISOString();
  const providedName = normalizeString(payload.name) || username;
  const providedEmail = normalizeIdentifier(payload.email);
  const fallbackEmail = `${username}@external-auth.local`;
  const nextEmail = isValidEmail(providedEmail) ? providedEmail : fallbackEmail;
  const existingByUsername = getAuthUserRowByUsername(username);
  const existingByEmail = getAuthUserRowByEmail(nextEmail);
  const existingUser = existingByUsername ?? existingByEmail;

  if (existingUser) {
    if (existingUser.status !== "Active") {
      throw new Error("This account is disabled");
    }

    const resolvedEmail =
      isValidEmail(nextEmail) && !isEmailOwnedByAnotherUser(nextEmail, existingUser.userId)
        ? nextEmail
        : existingUser.email;
    const resolvedUsername =
      existingByUsername || (existingByEmail && existingByEmail.userId !== existingUser.userId)
        ? existingUser.username
        : username;
    const resolvedName = providedName || existingUser.name;

    db.prepare(
      `
        UPDATE auth_users
        SET
          username = ?,
          name = ?,
          email = ?,
          updatedAt = ?,
          lastLogin = ?
        WHERE userId = ?
      `
    ).run(
      resolvedUsername,
      resolvedName,
      resolvedEmail,
      timestamp,
      timestamp,
      existingUser.userId
    );

    return buildAuthResponse(
      mapAuthUser({
        ...existingUser,
        username: resolvedUsername,
        name: resolvedName,
        email: resolvedEmail,
        updatedAt: timestamp,
        lastLogin: timestamp,
      })
    );
  }

  const requestedRole = normalizeRole(payload.role);
  const assignedRole = requestedRole ?? (getUserCount() === 0 ? "SUPER_ADMIN" : "USER");
  const createdUser: AuthUser = {
    userId: getNextUserId(),
    username,
    name: providedName,
    email: nextEmail,
    role: assignedRole,
    status: "Active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.prepare(
    `
      INSERT INTO auth_users (
        userId,
        username,
        name,
        email,
        passwordHash,
        role,
        status,
        createdAt,
        updatedAt,
        lastLogin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    createdUser.userId,
    createdUser.username,
    createdUser.name,
    createdUser.email,
    bcrypt.hashSync(randomUUID(), 10),
    createdUser.role,
    createdUser.status,
    createdUser.createdAt,
    createdUser.updatedAt,
    timestamp
  );

  return buildAuthResponse({
    ...createdUser,
    lastLogin: timestamp,
    updatedAt: timestamp,
  });
};

export const verifyAccessToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;

  if (
    !decoded ||
    typeof decoded.sub !== "string" ||
    typeof decoded.username !== "string" ||
    typeof decoded.role !== "string" ||
    typeof decoded.name !== "string" ||
    typeof decoded.email !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  return decoded;
};
