import Database from "better-sqlite3"
import path from "path"
import fs from "fs"
import { env } from "../env"

const dbPath =
  env.SQLITE_DB_PATH || path.join(process.cwd(), "data", "bot.sqlite")

// ensure folder exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true })

export const connection = new Database(dbPath)
connection.pragma("journal_mode = WAL")

// simple users table – только id, telegram и username
connection
  .prepare(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      telegram_id INTEGER UNIQUE NOT NULL,
      username TEXT,
      created_at TEXT NOT NULL
    )`,
  )
  .run()

export const isConnected = () => !!connection