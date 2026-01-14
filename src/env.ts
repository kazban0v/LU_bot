import dotenv from "dotenv"
import path from "path"
import { Environment } from "./types/app"
import fs from "fs"

const local = path.resolve(process.cwd(), ".env.local")
if (fs.existsSync(local)) {
  dotenv.config({ path: local })
} else {
  dotenv.config()
}

interface Env {
  TELEGRAM_TOKEN: string
  GEMINI_API_KEY: string
  GROQ_API_KEY: string | null
  ENV: Environment
  SQLITE_DB_PATH: string | null
}

export const env: Env = {
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN!,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  GROQ_API_KEY: process.env.GROQ_API_KEY || null,
  SQLITE_DB_PATH: process.env.SQLITE_DB_PATH || null,
  ENV: (process.env.NODE_ENV as Environment) || Environment.Production,
}
