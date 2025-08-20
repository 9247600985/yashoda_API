import sql from "mssql";
import { logQuery } from "./utilities/logger";

export const config: sql.config = {
  user: "sa",
  password: "PROSOFT@123",
  server: "183.82.146.20",
  port: 1466,
  database: "YASHODA_CLINICS_250624",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

export const conpool = new sql.ConnectionPool(config);
conpool.connect().catch(err =>
  console.error("Pool connect error:", err.message || err)
);

// Define return type
interface DbQueryResult {
  records: any[];
  rowsAffected: number[];
  output: Record<string, any>;
}

// Centralized query function with logging
export async function executeDbQuery(
  query: string,
  params: Record<
    string,
    | any
    | {
        value: any;
        type: sql.ISqlTypeFactoryWithNoParams | sql.ISqlTypeFactoryWithLength;
        direction?: "input" | "output";
      }
  > = {},
  meta: { query?: string; params?: any } = {}
): Promise<DbQueryResult> {
  const start = Date.now();
  const req = conpool.request();

  // Handle input/output params
  for (const [k, v] of Object.entries(params)) {
    if (v && typeof v === "object" && "type" in v) {
      if (v.direction === "output") {
        req.output(k, v.type);
      } else {
        req.input(k, v.type, v.value);
      }
    } else {
      req.input(k, v); // fallback simple usage
    }
  }

  try {
    const result = await req.query(query);

    logQuery?.({
      query: meta.query || query,
      params: meta.params || params,
      resultCount: result.recordset?.length || 0,
      rowsAffected: result.rowsAffected || [0],
      execTime: `${Date.now() - start} ms`,
    });

    return {
      records: result.recordset || [],
      rowsAffected: result.rowsAffected || [0],
      output: result.output || {},
    };
  } catch (err: any) {
    logQuery?.({
      query: meta.query || query,
      params: meta.params || params,
      error: err.message,
      execTime: `${Date.now() - start} ms`,
    });

    throw err;
  }
}
