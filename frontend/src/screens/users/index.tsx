"use client";

import { useAppSelector } from "@/services/store";
import { useGetUsersQuery } from "@/services/api";
import { useCreateUserMutation, User, UserRole } from "@/services/api";
import Header from "@/components/Header";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { FormEvent, useMemo, useState } from "react";

const columns: GridColDef<User>[] = [
  { field: "userId", headerName: "ID", width: 100 },
  { field: "name", headerName: "Name", width: 180 },
  { field: "username", headerName: "Username", width: 150 },
  { field: "email", headerName: "Email", width: 220 },
  { field: "role", headerName: "Role", width: 130 },
  { field: "status", headerName: "Status", width: 120 },
  { field: "lastLogin", headerName: "Last Login", width: 180 },
];

const inputClassName =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const roleOptions: UserRole[] = ["VIEWER", "USER", "ADMIN"];

const getMutationErrorMessage = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "message" in error.data &&
    typeof error.data.message === "string"
  ) {
    return error.data.message;
  }

  return "Unable to create the user.";
};

const Users = () => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const canManageUsers =
    currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";
  const { data: users, isError, isLoading } = useGetUsersQuery(undefined, {
    skip: !canManageUsers,
  });
  const [createUser, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [formState, setFormState] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "USER" as UserRole,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const availableRoleOptions = useMemo(() => {
    if (currentUser?.role === "SUPER_ADMIN") {
      return [...roleOptions, "SUPER_ADMIN" as const];
    }

    return roleOptions;
  }, [currentUser?.role]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const createdUser = await createUser(formState).unwrap();
      setFormState({
        name: "",
        username: "",
        email: "",
        password: "",
        role: "USER",
      });
      setSubmitSuccess(`${createdUser.name} was created successfully.`);
    } catch (error) {
      setSubmitError(getMutationErrorMessage(error));
    }
  };

  if (!canManageUsers) {
    return (
      <div className="flex flex-col gap-4">
        <Header name="Users" />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Only administrators can view or manage user accounts.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="py-4">Loading...</div>;
  }

  if (isError || !users) {
    return (
      <div className="text-center text-red-500 py-4">Failed to fetch users</div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="flex flex-col">
      <Header name="Users" />
      <DataGrid
        rows={users}
        columns={columns}
        getRowId={(row) => row.userId}
        className="bg-white shadow rounded-lg border border-gray-200 mt-5 min-h-[520px] !text-gray-700"
      />
      </div>

      <form
        onSubmit={handleSubmit}
        className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-800">Create User</h2>
        <p className="mt-1 text-sm text-gray-500">
          Add a new teammate without touching the database manually.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Full name
            </label>
            <input
              className={inputClassName}
              value={formState.name}
              onChange={(event) =>
                setFormState((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              className={inputClassName}
              value={formState.username}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              className={inputClassName}
              value={formState.email}
              onChange={(event) =>
                setFormState((current) => ({ ...current, email: event.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              className={inputClassName}
              value={formState.role}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  role: event.target.value as UserRole,
                }))
              }
            >
              {availableRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Temporary password
            </label>
            <input
              type="password"
              className={inputClassName}
              value={formState.password}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              required
            />
          </div>
        </div>

        {submitError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {submitError}
          </p>
        ) : null}
        {submitSuccess ? (
          <p className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {submitSuccess}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isCreatingUser}
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {isCreatingUser ? "Creating user..." : "Create user"}
        </button>
      </form>
    </div>
  );
};

export default Users;
