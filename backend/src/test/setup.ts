process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret";
process.env.EMAIL_FROM =
  process.env.EMAIL_FROM ?? "no-reply@classroom-clicker.test";
process.env.CLIENT_URL =
  process.env.CLIENT_URL ?? "http://localhost:5173";
process.env.EXPOSE_RESET_TOKEN =
  process.env.EXPOSE_RESET_TOKEN ?? "true";
