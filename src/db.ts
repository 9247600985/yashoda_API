// db.ts
import sql from "mssql";
import { logQuery, logError } from "./utilities/logger";

const isLocal = true;

const commonOptions = {
  encrypt: false,
  trustServerCertificate: true,
};

export const config: sql.config = {
  user: "sa",
  password: isLocal ? "prosoft@123" : "PROSOFT@123",
  server: isLocal ? "DESKTOP-2O02DD6" : "183.82.146.20",
  port: isLocal ? 1433 : 1466,
  database: "YASHODA_220825",
  options: commonOptions,
};

export const conpool = new sql.ConnectionPool(config);
conpool.connect().catch(err => logError(`Pool connect error: ${err.message || err}`));

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) return pool;
  pool = await sql.connect(config);
  return pool;
}

interface DbQueryResult {
  records: any[];
  rowsAffected: number[];
  output: Record<string, any>;
}

interface DbQueryMeta {
  query?: string;
  params?: any;
  request?: sql.Request;
  transaction?: sql.Transaction;
  isStoredProc?: boolean;
}

// --- Centralized query executor ---
export async function executeDbQuery(
  query: string,
  params: Record<string, any> = {},
  meta: DbQueryMeta = {}
): Promise<DbQueryResult> {
  const start = Date.now();
  let req: sql.Request;

  if (meta.request) {
    req = meta.request;
  } else if (meta.transaction) {
    req = new sql.Request(meta.transaction);
  } else {
    req = conpool.request();
  }

  // Bind parameters
  for (const [k, v] of Object.entries(params)) {
    if (v && typeof v === "object" && "type" in v) {
      if (v.direction === "output") {
        req.output(k, v.type);
      } else {
        req.input(k, v.type, v.value);
      }
    } else {
      req.input(k, v);
    }
  }

  try {
    const result = meta.isStoredProc
      ? await req.execute(query)
      : await req.query(query);

    logQuery({
      query: meta.query || query,
      params: meta.params || params,
      resultCount: result.recordset?.length || 0,
      rowsAffected: result.rowsAffected || [0],
      execTime: `${Date.now() - start} ms`,
      context: meta.transaction ? "transaction" : "pool",
    });

    return {
      records: result.recordset || [],
      rowsAffected: result.rowsAffected || [0],
      output: result.output || {},
    };
  } catch (err: any) {
    logQuery({
      query: meta.query || query,
      params: meta.params || params,
      error: err.message,
      execTime: `${Date.now() - start} ms`,
      context: meta.transaction ? "transaction" : "pool",
    });
    throw err;
  }
}
