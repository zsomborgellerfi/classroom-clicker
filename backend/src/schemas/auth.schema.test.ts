import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "./auth.schema";
import { UserRole } from "../enums/userRole";

describe("auth.schema", () => {
  describe("registerSchema", () => {
    it("accepts valid registration payload", () => {
      const result = registerSchema.parse({
        body: {
          email: "test@example.com",
          password: "password123",
          firstName: "John",
          lastName: "Doe",
        },
      });

      expect(result.body.email).toBe("test@example.com");
      expect(result.body.password).toBe("password123");
      expect(result.body.firstName).toBe("John");
      expect(result.body.lastName).toBe("Doe");
      expect(result.body.role).toBeUndefined();
    });

    it("accepts registration with optional role", () => {
      const result = registerSchema.parse({
        body: {
          email: "teacher@example.com",
          password: "password123",
          firstName: "Jane",
          lastName: "Smith",
          role: UserRole.TEACHER,
        },
      });

      expect(result.body.role).toBe(UserRole.TEACHER);
    });

    it("rejects invalid email", () => {
      expect(() =>
        registerSchema.parse({
          body: {
            email: "invalid-email",
            password: "password123",
            firstName: "John",
            lastName: "Doe",
          },
        }),
      ).toThrow();
    });

    it("rejects short password", () => {
      expect(() =>
        registerSchema.parse({
          body: {
            email: "test@example.com",
            password: "12345",
            firstName: "John",
            lastName: "Doe",
          },
        }),
      ).toThrow();
    });

    it("rejects empty firstName", () => {
      expect(() =>
        registerSchema.parse({
          body: {
            email: "test@example.com",
            password: "password123",
            firstName: "",
            lastName: "Doe",
          },
        }),
      ).toThrow();
    });

    it("rejects empty lastName", () => {
      expect(() =>
        registerSchema.parse({
          body: {
            email: "test@example.com",
            password: "password123",
            firstName: "John",
            lastName: "",
          },
        }),
      ).toThrow();
    });

    it("rejects invalid role", () => {
      expect(() =>
        registerSchema.parse({
          body: {
            email: "test@example.com",
            password: "password123",
            firstName: "John",
            lastName: "Doe",
            role: "INVALID_ROLE",
          },
        }),
      ).toThrow();
    });
  });

  describe("loginSchema", () => {
    it("accepts valid login payload", () => {
      const result = loginSchema.parse({
        body: {
          email: "test@example.com",
          password: "password123",
        },
      });

      expect(result.body.email).toBe("test@example.com");
      expect(result.body.password).toBe("password123");
    });

    it("rejects invalid email", () => {
      expect(() =>
        loginSchema.parse({
          body: {
            email: "invalid-email",
            password: "password123",
          },
        }),
      ).toThrow();
    });

    it("rejects missing password", () => {
      expect(() =>
        loginSchema.parse({
          body: {
            email: "test@example.com",
          },
        }),
      ).toThrow();
    });
  });

  describe("requestPasswordResetSchema", () => {
    it("accepts valid email", () => {
      const result = requestPasswordResetSchema.parse({
        body: {
          email: "test@example.com",
        },
      });

      expect(result.body.email).toBe("test@example.com");
    });

    it("rejects invalid email", () => {
      expect(() =>
        requestPasswordResetSchema.parse({
          body: {
            email: "invalid-email",
          },
        }),
      ).toThrow();
    });

    it("rejects missing email", () => {
      expect(() =>
        requestPasswordResetSchema.parse({
          body: {},
        }),
      ).toThrow();
    });
  });

  describe("resetPasswordSchema", () => {
    it("accepts valid reset payload", () => {
      const result = resetPasswordSchema.parse({
        body: {
          token: "valid-token-1234567890",
          password: "newpassword123",
        },
      });

      expect(result.body.token).toBe("valid-token-1234567890");
      expect(result.body.password).toBe("newpassword123");
    });

    it("rejects short token", () => {
      expect(() =>
        resetPasswordSchema.parse({
          body: {
            token: "short",
            password: "newpassword123",
          },
        }),
      ).toThrow();
    });

    it("rejects short password", () => {
      expect(() =>
        resetPasswordSchema.parse({
          body: {
            token: "valid-token-1234567890",
            password: "12345",
          },
        }),
      ).toThrow();
    });

    it("rejects missing token", () => {
      expect(() =>
        resetPasswordSchema.parse({
          body: {
            password: "newpassword123",
          },
        }),
      ).toThrow();
    });

    it("rejects missing password", () => {
      expect(() =>
        resetPasswordSchema.parse({
          body: {
            token: "valid-token-1234567890",
          },
        }),
      ).toThrow();
    });
  });
});

