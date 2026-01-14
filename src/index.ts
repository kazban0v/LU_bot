import { env } from "./env"
import { Telegraf, session } from "telegraf"
import { message } from "telegraf/filters"
import Logger from "js-logger"
import { BotContext, Environment } from "./types/app"
import { hearsText, hearsPhoto, help, reset, start } from "./actions"
import { defaultSession } from "./session"
import { checkConfig, checkSession, checkUser } from "./middleware"

// Log messages will be written to the window's console.
Logger.useDefaults()
const LoggerLevel =
  env.ENV === Environment.Production ? Logger.WARN : Logger.DEBUG
Logger.info("Logger init", LoggerLevel)
Logger.setLevel(LoggerLevel)

const bot = new Telegraf<BotContext>(env.TELEGRAM_TOKEN)
bot.use(session({ defaultSession }), checkConfig, checkSession)

// Commands and listening
bot.start(start)
bot.help(help)
bot.command("reset", reset)

// Дальше можно только с положительным балансом
bot.use(checkUser)
bot.on(message("text"), hearsText)
bot.on(message("photo"), hearsPhoto)

bot.launch()

const signals = ["SIGINT", "SIGTERM", "SIGQUIT"]
signals.forEach((signal: string) =>
  process.on(signal, () => {
    Logger.info("[App] Exit", signal)
    bot.stop(signal)
    process.exit()
  }),
)
