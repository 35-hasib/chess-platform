import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET", "dev-secret"),
  PORT: parseInt(required("PORT", "4000"), 10),
  CLIENT_ORIGIN: required("CLIENT_ORIGIN", "http://localhost:3000"),
};
