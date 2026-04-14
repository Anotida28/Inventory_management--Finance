const assert = require("node:assert/strict");

const { createMysqlTestHarness } = require("./mysqlTestHarness");

const main = async () => {
  const harness = await createMysqlTestHarness("omari_auth_regression");

  process.env.JWT_SECRET = "auth-regression-secret";

  try {
    const {
      createUserData,
      listUsersData,
      syncExternalUserData,
      verifyAccessToken,
    } = require("../dist/lib/authData.js");

    const bootstrapAuth = syncExternalUserData({
      name: "Admin Bootstrap",
      username: "admin.bootstrap",
      email: "admin.bootstrap@omari.co.zw",
      role: "SUPER_ADMIN",
    });

    assert.ok(bootstrapAuth.accessToken);
    assert.equal(bootstrapAuth.tokenType, "Bearer");
    assert.equal(bootstrapAuth.user.role, "SUPER_ADMIN");
    assert.equal(bootstrapAuth.user.username, "admin.bootstrap");

    const secondSync = syncExternalUserData({
      username: "admin.bootstrap",
      email: "admin.bootstrap@omari.co.zw",
      name: "Admin Bootstrap",
    });
    assert.equal(secondSync.user.userId, bootstrapAuth.user.userId);
    assert.ok(secondSync.user.lastLogin);

    const decodedToken = verifyAccessToken(secondSync.accessToken);
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
    delete process.env.JWT_SECRET;
    await harness.stop();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
