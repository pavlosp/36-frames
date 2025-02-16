// logger.ts
import { createLogger, format, transports } from "winston";

export const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  // Example: use JSON logs in production, simpler text logs in dev
  format:
    process.env.NODE_ENV === "production"
      ? format.json()
      : format.combine(format.colorize(), format.simple()),
  transports: [
    // Logs go to the console by default
    new transports.Console(),
  ],
});
