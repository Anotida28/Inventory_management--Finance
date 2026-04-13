const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const createTempDatabasePath = () => {
  const tempDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "omari-auth-regression-")
  );

  return {
    tempDirectory,
    databasePath: path.join(tempDirectory, "operations.sqlite"),
  };
};

const { tempDirectory, databasePath } = createTempDatabasePath();

process.env.OPERATIONS_DB_PATH = databasePath;
process.env.JWT_SECRET = "auth-regression-secret";

try {
  const {
    createUserData,
    getAuthBootstrapStatusData,
    listUsersData,
    loginUserData,
    registerInitialUserData,
    verifyAccessToken,
  } = require("../dist/lib/authData.js");

  assert.deepEqual(getAuthBootstrapStatusData(), {
    userCount: 0,
    requiresSetup: true,
  });

  const bootstrapAuth = registerInitialUserData({
    name: "Admin Bootstrap",
    username: "admin.bootstrap",
    email: "admin.bootstrap@omari.co.zw",
    password: "Password123",
  });

  assert.ok(bootstrapAuth.accessToken);
  assert.equal(bootstrapAuth.tokenType, "Bearer");
  assert.equal(bootstrapAuth.user.role, "SUPER_ADMIN");
  assert.equal(bootstrapAuth.user.username, "admin.bootstrap");

  assert.deepEqual(getAuthBootstrapStatusData(), {
    userCount: 1,
    requiresSetup: false,
  });

  assert.throws(
    () =>
      registerInitialUserData({
        name: "Second Bootstrap",
        username: "second.bootstrap",
        email: "second.bootstrap@omari.co.zw",
        password: "Password123",
      }),
    /The system has already been initialized/
  );

  assert.throws(
    () =>
      loginUserData({
        username: "admin.bootstrap",
        password: "wrong-password",
      }),
    /Invalid username or password/
  );

  const emailLogin = loginUserData({
    username: "admin.bootstrap@omari.co.zw",
    password: "Password123",
  });
  assert.equal(emailLogin.user.userId, bootstrapAuth.user.userId);
  assert.ok(emailLogin.user.lastLogin);

  const decodedToken = verifyAccessToken(emailLogin.accessToken);
  assert.equal(decodedToken.sub, bootstrapAuth.user.userId);
  assert.equal(decodedToken.username, "admin.bootstrap");
  assert.equal(decodedToken.role, "SUPER_ADMIN");

  const createdAdmin = createUserData(
    {
      name: "Operations Admin",
      username: "ops.admin",
      email: "ops.admin@omari.co.zw",
      password: "Password123",
      role: "ADMIN",
    },
    bootstrapAuth.user
  );
  assert.equal(createdAdmin.role, "ADMIN");

  const createdViewer = createUserData(
    {
      name: "Read Only User",
      username: "viewer.user",
      email: "viewer.user@omari.co.zw",
      password: "Password123",
      role: "VIEWER",
    },
    createdAdmin
  );
  assert.equal(createdViewer.role, "VIEWER");

  assert.throws(
    () =>
      createUserData(
        {
          name: "Escalated Account",
          username: "superadmin.clone",
          email: "superadmin.clone@omari.co.zw",
          password: "Password123",
          role: "SUPER_ADMIN",
        },
        createdAdmin
      ),
    /Only super administrators can create super administrators/
  );

  assert.throws(
    () =>
      createUserData(
        {
          name: "Duplicate Username",
          username: "viewer.user",
          email: "duplicate.username@omari.co.zw",
          password: "Password123",
          role: "USER",
        },
        bootstrapAuth.user
      ),
    /Username is already in use/
  );

  assert.throws(
    () =>
      createUserData(
        {
          name: "Duplicate Email",
          username: "duplicate.email",
          email: "viewer.user@omari.co.zw",
          password: "Password123",
          role: "USER",
        },
        bootstrapAuth.user
      ),
    /Email is already in use/
  );

  const users = listUsersData();
  assert.equal(users.length, 3);
  assert.deepEqual(
    users.map((user) => user.role),
    ["SUPER_ADMIN", "ADMIN", "VIEWER"]
  );

  console.log("Auth workflow regression checks passed.");
} finally {
  delete process.env.OPERATIONS_DB_PATH;
  delete process.env.JWT_SECRET;

  try {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  } catch {
    // SQLite file cleanup is best-effort on Windows.
  }
}
