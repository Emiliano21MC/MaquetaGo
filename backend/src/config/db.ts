import {databaseOptions} from './database-options';
import mysql, { PoolConnection, RowDataPacket } from "mysql2/promise";
import { env } from "./env";
export const pool = mysql.createPool({...databaseOptions,database:env.dbName,waitForConnections:true,connectionLimit:10,maxIdle:10,idleTimeout:60000,queueLimit:100});
export type DB = typeof pool | PoolConnection;
export async function rows<T extends RowDataPacket = RowDataPacket>(
  db: DB,
  sql: string,
  params: (string | number | boolean | null)[] = [],
): Promise<T[]> {
  const [result] = await db.execute<T[]>(sql, params);
  return result;
}
export async function transaction<T>(run: (db: PoolConnection) => Promise<T>) {
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const result = await run(db);
    await db.commit();
    return result;
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    db.release();
  }
}
