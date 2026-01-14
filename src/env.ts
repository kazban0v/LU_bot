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
  ADMIN_CHAT_ID: string | null
  ENV: Environment
  SQLITE_DB_PATH: string | null
}

// Функция для получения переменной окружения с обрезкой пробелов
const getEnv = (key: string): string | undefined => {
  // Проверяем точное совпадение
  if (process.env[key]) {
    console.log(`[ENV] Found ${key} (exact match)`)
    return process.env[key]
  }
  // Проверяем с пробелом в конце (на случай ошибки в Railway)
  if (process.env[`${key} `]) {
    console.log(`[ENV] Found ${key} (with trailing space)`)
    return process.env[`${key} `]?.trim()
  }
  // Проверяем с пробелом в начале
  if (process.env[` ${key}`]) {
    console.log(`[ENV] Found ${key} (with leading space)`)
    return process.env[` ${key}`]?.trim()
  }
  console.log(`[ENV] Not found ${key}`)
  return undefined
}

// Проверка обязательных переменных окружения
const telegramToken = getEnv('TELEGRAM_TOKEN')
const geminiApiKey = getEnv('GEMINI_API_KEY')

if (!telegramToken) {
  console.error('Missing TELEGRAM_TOKEN. Available env vars:', Object.keys(process.env).filter(k => 
    k.includes('TELEGRAM') || k.includes('GEMINI') || k.includes('GROQ')
  ))
  throw new Error("TELEGRAM_TOKEN is required. Please set it in Railway Variables.")
}
if (!geminiApiKey) {
  console.error('Missing GEMINI_API_KEY. Available env vars:', Object.keys(process.env).filter(k => 
    k.includes('TELEGRAM') || k.includes('GEMINI') || k.includes('GROQ')
  ))
  throw new Error("GEMINI_API_KEY is required. Please set it in Railway Variables.")
}

export const env: Env = {
  TELEGRAM_TOKEN: telegramToken,
  GEMINI_API_KEY: geminiApiKey,
  GROQ_API_KEY: getEnv('GROQ_API_KEY') || null,
  ADMIN_CHAT_ID: getEnv('ADMIN_CHAT_ID') || null,
  SQLITE_DB_PATH: process.env.SQLITE_DB_PATH || null,
  ENV: (process.env.NODE_ENV as Environment) || Environment.Production,
}
