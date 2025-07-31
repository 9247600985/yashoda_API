import sql from "mssql";
import { logQuery } from "./utilities/logger";

// MSSQL config
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

// Shared pool
export const conpool = new sql.ConnectionPool(config);
conpool.connect().catch(err =>
  console.error("Pool connect error:", err.message || err)
);

// Define return type for executeDbQuery
interface DbQueryResult {
  records: any[];
  rowsAffected: number[];
}

// Centralized query function with logging
export async function executeDbQuery(
  query: string,
  params: Record<string, any> = {},
  meta: { query?: string; params?: any } = {}
): Promise<DbQueryResult> {
  const start = Date.now();
  const req = conpool.request();

  // Set parameters
  for (const [k, v] of Object.entries(params)) {
    req.input(k, v);
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
      rowsAffected: result.rowsAffected || [0]
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