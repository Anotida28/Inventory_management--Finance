import { Request, Response } from "express";
import type { AuthResponse, AuthUser } from "../lib/authData";
import { AUTH_TOKEN_TTL_SECONDS } from "../lib/authConstants";
import {
  clearAuthSessionCookie,
  setAuthSessionCookie,
} from "../lib/authSessionCookie";
import { backendRuntime } from "../lib/runtimeClient";
import type { AuthenticatedRequest } from "../middleware/authMiddleware";

type AuthSessionResponse = {
  expiresIn: number;
  user: AuthUser;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected server error";
};

const resolveRememberMe = (value: unknown) => value === true;

const buildSessionResponse = (authResponse: AuthResponse): AuthSessionResponse => ({
  expiresIn: authResponse.expiresIn,
  user: authResponse.user,
});

export const getAuthBootstrapStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(await backendRuntime.auth.getAuthBootstrapStatus());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving auth status" });
  }
};

export const registerInitialUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const authResponse = await backendRuntime.auth.registerInitialUser({
      username: req.body.username,
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
    });

    setAuthSessionCookie(res, authResponse.accessToken, {
      persistent: resolveRememberMe(req.body.rememberMe),
      maxAgeSeconds: AUTH_TOKEN_TTL_SECONDS,
    });

    res.status(201).json(buildSessionResponse(authResponse));
  } catch (error) {
    const message = getErrorMessage(error);

    if (
      message === "The system has already been initialized" ||
      message === "Missing required user fields" ||
      message === "A valid email address is required" ||
      message === "Password must be at least 8 characters long" ||
      message.includes("Username must be")
    ) {
      res.status(400).json({ message });
      return;
    }

    if (
      message === "Username is already in use" ||
      message === "Email is already in use"
    ) {
      res.status(409).json({ message });
      return;
    }

    res.status(500).json({ message: "Error creating initial user" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const authResponse = await backendRuntime.auth.loginUser({
      username: req.body.username,
      password: req.body.password,
    });

    setAuthSessionCookie(res, authResponse.accessToken, {
      persistent: resolveRememberMe(req.body.rememberMe),
      maxAgeSeconds: AUTH_TOKEN_TTL_SECONDS,
    });

    res.json(buildSessionResponse(authResponse));
  } catch (error) {
    const message = getErrorMessage(error);

    if (message === "Username and password are required") {
      res.status(400).json({ message });
      return;
    }

    if (
      message === "Invalid username or password" ||
      message === "This account is disabled"
    ) {
      res.status(401).json({ message });
      return;
    }

    res.status(500).json({ message: "Error logging in" });
  }
};

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const user = await backendRuntime.auth.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving current user" });
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  clearAuthSessionCookie(res);
  res.status(204).send();
};
