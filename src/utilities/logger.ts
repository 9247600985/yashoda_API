import winston from "winston";
import "winston-daily-rotate-file";

const transport = new (winston.transports as any).DailyRotateFile({
  dirname: "logs",
  filename: "log_%DATE%.log",
  datePattern: "DD-MM-YYYY",
  maxSize: "50m",
  maxFiles: "7d",
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.printf(info => {
    const timestamp = new Date().toLocaleString("en-IN", { hour12: false });
    return `[${timestamp}] ${info.level.toUpperCase()}: ${info.message}`;
  }),
  transports: [transport],
});

// --- Utility wrappers ---
export const logInfo = (message: string) => logger.info(message);

export const logError = (message: string) => logger.error(message);

export const logQuery = (meta: any) => {
  const parts = [
    `Query: ${meta.query}`,
    meta.params ? `Params: ${JSON.stringify(meta.params)}` : null,
    meta.error ? `Error: ${meta.error}` : null,
    meta.resultCount !== undefined ? `Result Count: ${meta.resultCount}` : null,
    meta.rowsAffected ? `Rows Affected: ${meta.rowsAffected}` : null,
    meta.execTime ? `Execution Time: ${meta.execTime}` : null,
    meta.context ? `Context: ${meta.context}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
  if (meta.error) {
    logger.error(parts);
  } else {
    logger.info(parts);
  }
};

export default logger;
