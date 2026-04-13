"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAccessToken = exports.loginUserData = exports.registerInitialUserData = exports.createUserData = exports.listUsersData = exports.getUserByIdData = exports.getAuthBootstrapStatusData = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("./database");
const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 8;
const AUTH_TOKEN_TTL = `${AUTH_TOKEN_TTL_SECONDS}s`;
const allowedRoles = ["SUPER_ADMIN", "ADMIN", "USER", "VIEWER"];
const normalizeString = (value) => typeof value === "string" ? value.trim() : "";
const normalizeIdentifier = (value) => normalizeString(value).toLowerCase();
const normalizeRole = (value) => {
    const normalizedRole = normalizeString(value).toUpperCase();
    if (allowedRoles.includes(normalizedRole)) {
        return normalizedRole;
    }
    return undefined;
};
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidUsername = (value) => /^[a-z0-9._-]{3,32}$/i.test(value);
const getJwtSecret = () => process.env.JWT_SECRET || "dev-secret";
const ensureAuthSchema = () => {
    database_1.db.exec(`
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
    (0, database_1.ensureIndex)("auth_users", "idx_auth_users_username", ["username"]);
    (0, database_1.ensureIndex)("auth_users", "idx_auth_users_email", ["email"]);
};
ensureAuthSchema();
const mapAuthUser = (row) => {
    var _a;
    return ({
        userId: row.userId,
        username: row.username,
        name: row.name,
        email: row.email,
        role: row.role,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastLogin: (_a = row.lastLogin) !== null && _a !== void 0 ? _a : undefined,
    });
};
const getNextUserId = () => {
    const highestSequence = database_1.db.getNumericSuffixSequence("auth_users", "userId", 5);
    return `USR-${String(highestSequence + 1).padStart(3, "0")}`;
};
const getAuthUserRowById = (userId) => {
    return database_1.db
        .prepare(`
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
      `)
        .get(userId);
};
const getAuthUserRowByIdentifier = (identifier) => {
    return database_1.db
        .prepare(`
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
        WHERE username = ? OR email = ?
      `)
        .get(identifier, identifier);
};
const getUserCount = () => {
    return database_1.db.prepare("SELECT COUNT(*) AS count FROM auth_users").get().count || 0;
};
const updateUserLoginTimestamp = (userId) => {
    const lastLogin = new Date().toISOString();
    database_1.db.prepare(`
      UPDATE auth_users
      SET
        lastLogin = ?,
        updatedAt = ?
      WHERE userId = ?
    `).run(lastLogin, lastLogin, userId);
    return lastLogin;
};
const signAccessToken = (user) => {
    return jsonwebtoken_1.default.sign({
        sub: user.userId,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
    }, getJwtSecret(), { expiresIn: AUTH_TOKEN_TTL });
};
const buildAuthResponse = (user) => ({
    accessToken: signAccessToken(user),
    tokenType: "Bearer",
    expiresIn: AUTH_TOKEN_TTL_SECONDS,
    user,
});
const validateCommonUserFields = (payload) => {
    const username = normalizeIdentifier(payload.username);
    const name = normalizeString(payload.name);
    const email = normalizeIdentifier(payload.email);
    const password = typeof payload.password === "string" ? payload.password.trim() : "";
    if (!username || !name || !email || !password) {
        throw new Error("Missing required user fields");
    }
    if (!isValidUsername(username)) {
        throw new Error("Username must be 3-32 characters and only use letters, numbers, dots, underscores, or hyphens");
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
const ensureUserIsUnique = (username, email) => {
    const duplicateByUsername = database_1.db
        .prepare("SELECT userId FROM auth_users WHERE username = ?")
        .get(username);
    if (duplicateByUsername) {
        throw new Error("Username is already in use");
    }
    const duplicateByEmail = database_1.db
        .prepare("SELECT userId FROM auth_users WHERE email = ?")
        .get(email);
    if (duplicateByEmail) {
        throw new Error("Email is already in use");
    }
};
const getAuthBootstrapStatusData = () => {
    const userCount = getUserCount();
    return {
        userCount,
        requiresSetup: userCount === 0,
    };
};
exports.getAuthBootstrapStatusData = getAuthBootstrapStatusData;
const getUserByIdData = (userId) => {
    const row = getAuthUserRowById(userId);
    return row ? mapAuthUser(row) : undefined;
};
exports.getUserByIdData = getUserByIdData;
const listUsersData = () => {
    const rows = database_1.db
        .prepare(`
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
      `)
        .all();
    return rows.map(mapAuthUser);
};
exports.listUsersData = listUsersData;
const createUserData = (payload, actor) => {
    var _a;
    const { username, name, email, password } = validateCommonUserFields(payload);
    const requestedRole = (_a = normalizeRole(payload.role)) !== null && _a !== void 0 ? _a : "USER";
    if (!["ADMIN", "SUPER_ADMIN"].includes(actor.role)) {
        throw new Error("Only administrators can create users");
    }
    if (requestedRole === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
        throw new Error("Only super administrators can create super administrators");
    }
    ensureUserIsUnique(username, email);
    const timestamp = new Date().toISOString();
    const createdUser = {
        userId: getNextUserId(),
        username,
        name,
        email,
        role: requestedRole,
        status: "Active",
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    database_1.db.prepare(`
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
    `).run(createdUser.userId, createdUser.username, createdUser.name, createdUser.email, bcryptjs_1.default.hashSync(password, 10), createdUser.role, createdUser.status, createdUser.createdAt, createdUser.updatedAt, null);
    return createdUser;
};
exports.createUserData = createUserData;
const registerInitialUserData = (payload) => {
    if (getUserCount() > 0) {
        throw new Error("The system has already been initialized");
    }
    const { username, name, email, password } = validateCommonUserFields(payload);
    ensureUserIsUnique(username, email);
    const timestamp = new Date().toISOString();
    const createdUser = {
        userId: getNextUserId(),
        username,
        name,
        email,
        role: "SUPER_ADMIN",
        status: "Active",
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    database_1.db.prepare(`
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
    `).run(createdUser.userId, createdUser.username, createdUser.name, createdUser.email, bcryptjs_1.default.hashSync(password, 10), createdUser.role, createdUser.status, createdUser.createdAt, createdUser.updatedAt, timestamp);
    return buildAuthResponse(Object.assign(Object.assign({}, createdUser), { lastLogin: timestamp, updatedAt: timestamp }));
};
exports.registerInitialUserData = registerInitialUserData;
const loginUserData = (payload) => {
    const identifier = normalizeIdentifier(payload.username);
    const password = typeof payload.password === "string" ? payload.password.trim() : "";
    if (!identifier || !password) {
        throw new Error("Username and password are required");
    }
    const userRow = getAuthUserRowByIdentifier(identifier);
    if (!userRow || !bcryptjs_1.default.compareSync(password, userRow.passwordHash)) {
        throw new Error("Invalid username or password");
    }
    if (userRow.status !== "Active") {
        throw new Error("This account is disabled");
    }
    const lastLogin = updateUserLoginTimestamp(userRow.userId);
    return buildAuthResponse(mapAuthUser(Object.assign(Object.assign({}, userRow), { lastLogin, updatedAt: lastLogin })));
};
exports.loginUserData = loginUserData;
const verifyAccessToken = (token) => {
    const decoded = jsonwebtoken_1.default.verify(token, getJwtSecret());
    if (!decoded ||
        typeof decoded.sub !== "string" ||
        typeof decoded.username !== "string" ||
        typeof decoded.role !== "string" ||
        typeof decoded.name !== "string" ||
        typeof decoded.email !== "string") {
        throw new Error("Invalid token payload");
    }
    return decoded;
};
exports.verifyAccessToken = verifyAccessToken;
