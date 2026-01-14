import { IUser } from "../models/user"
import { connection } from "../db"
import { generateUserId } from "../../utils"

type CreateUserInput = { telegramId: number; name?: string }

const rowToUser = (row: any): IUser => ({
  id: row.id,
  telegramId: row.telegram_id,
  username: row.username ?? undefined,
  createdAt: row.created_at,
})

export default {
  async create(user: CreateUserInput): Promise<IUser | null> {
    const id = generateUserId(user.telegramId)
    const createdAt = new Date().toISOString()
    connection
      .prepare(
        `INSERT OR IGNORE INTO users (id, telegram_id, username, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(id, user.telegramId, user.name || null, createdAt)

    const row = connection
      .prepare(`SELECT * FROM users WHERE telegram_id = ?`)
      .get(user.telegramId)
    return row ? rowToUser(row) : null
  },
  async getByTelegramId(telegramId: number): Promise<IUser | null> {
    const row = connection
      .prepare(`SELECT * FROM users WHERE telegram_id = ?`)
      .get(telegramId)
    return row ? rowToUser(row) : null
  },
  async firstOrCreate(telegramId: number, name: string): Promise<IUser | null> {
    let user = await this.getByTelegramId(telegramId)
    if (!user) {
      user = await this.create({ telegramId, name })
    }
    return user
  },
}
