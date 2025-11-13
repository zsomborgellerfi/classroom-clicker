import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";

import { UserRole } from "../enums/userRole";
import type { AuthRequest } from "../types";
import { authMiddleware, roleCheck } from "./auth";

jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
  },
}));

const mockedJwt = jwt as unknown as { verify: jest.Mock };

const createResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
};

const createNext = () => jest.fn() as jest.MockedFunction<NextFunction>;

describe("authMiddleware", () => {
  beforeEach(() => {
    mockedJwt.verify.mockReset();
  });

  it("returns 401 when no authorization header is present", () => {
    const req = { headers: {} } as AuthRequest;
    const res = createResponse();
    const next = createNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Authentication required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token verification fails", () => {
    const req = {
      headers: { authorization: "Bearer invalid" },
    } as AuthRequest;
    const res = createResponse();
    const next = createNext();

    mockedJwt.verify.mockImplementation(() => {
      throw new Error("invalid token");
    });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches the decoded user and calls next on success", () => {
    const req = {
      headers: { authorization: "Bearer valid" },
    } as AuthRequest;
    const res = createResponse();
    const next = createNext();

    const decoded = {
      id: "user-123",
      email: "teacher@example.com",
      role: UserRole.TEACHER,
    };

    mockedJwt.verify.mockReturnValue(decoded);

    authMiddleware(req, res, next);

    expect(req.user).toEqual(decoded);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("roleCheck", () => {
  it("returns 401 when req.user is missing", () => {
    const req = {} as AuthRequest;
    const res = createResponse();
    const next = createNext();

    roleCheck([UserRole.TEACHER])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Authentication required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows admins through regardless of required roles", () => {
    const req = {
      user: { role: UserRole.ADMIN },
    } as AuthRequest;
    const res = createResponse();
    const next = createNext();

    roleCheck([UserRole.STUDENT])(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("denies users without the required role", () => {
    const req = {
      user: { role: UserRole.STUDENT },
    } as AuthRequest;
    const res = createResponse();
    const next = createNext();

    roleCheck([UserRole.TEACHER])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Unauthorized",
      requiredRoles: [UserRole.TEACHER],
      userRole: UserRole.STUDENT,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("passes through when the user has an allowed role", () => {
    const req = {
      user: { role: UserRole.TEACHER },
    } as AuthRequest;
    const res = createResponse();
    const next = createNext();

    roleCheck([UserRole.TEACHER, UserRole.ADMIN])(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
