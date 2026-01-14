import { BotContext, UserSession } from "./types/app"
import Logger from "js-logger"
import { message } from "telegraf/filters"
import { code } from "telegraf/format"
import { getSession, resetSession } from "./session"
import { chatMessage } from "./chat"
import { FmtString } from "telegraf/format"
import { helpKeyboard } from "./keyboard"
import messages from "./messages"
import * as packageJson from "../package.json"
import axios from "axios"
import fs from "fs"
import path from "path"
import { env } from "./env"

export const start = async (ctx: BotContext) => {
  const session = await getSession(ctx)
  const hello = messages.m("start.hello", { username: session.firstname })
  const aboutMessage = messages.m("start.about")
  ctx.replyWithMarkdownV2(hello + "\n\n" + aboutMessage)
}

export const help = async (ctx: BotContext) => {
  const helpMessage = messages.m("help")
  ctx.replyWithMarkdownV2(helpMessage, helpKeyboard)
}

export const balance = async (ctx: BotContext) => {
  await ctx.reply("Баланс токенов больше не используется, бот для тебя полностью бесплатный 💙")
}

export async function hearsVoice(ctx: BotContext) {
  await ctx.reply(
    "Пока что я понимаю только текстовые сообщения. Голос позже тоже научусь распознавать 💬",
  )
}

// Функция для скачивания и конвертации изображения в base64
async function downloadImageAsBase64(fileId: string, ctx: BotContext): Promise<{ data: string; mimeType: string; savedPath?: string } | null> {
  try {
    const file = await ctx.telegram.getFile(fileId)
    const fileUrl = `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`
    
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer'
    })
    
    const buffer = Buffer.from(response.data)
    const base64 = buffer.toString('base64')
    
    // Определяем MIME тип по расширению файла
    const extension = file.file_path?.split('.').pop()?.toLowerCase() || 'jpg'
    let mimeType = 'image/jpeg' // по умолчанию
    if (extension === 'png') mimeType = 'image/png'
    else if (extension === 'gif') mimeType = 'image/gif'
    else if (extension === 'webp') mimeType = 'image/webp'
    
    // Сохраняем фото в папку для просмотра
    const photosDir = path.join(process.cwd(), 'received_photos')
    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir, { recursive: true })
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `photo_${timestamp}_${fileId.substring(0, 8)}.${extension}`
    const savedPath = path.join(photosDir, filename)
    
    fs.writeFileSync(savedPath, buffer)
    
    Logger.info(`[ФОТО] Сохранено: ${savedPath} (${(buffer.length / 1024).toFixed(2)} KB, ${mimeType})`)
    
    return { data: base64, mimeType, savedPath }
  } catch (error) {
    Logger.error("[Image] Error downloading image", error)
    return null
  }
}

export async function hearsPhoto(ctx: BotContext) {
  const typing = sendTypingInterval(ctx)
  try {
    if (!ctx.has(message("photo"))) {
      throw new Error("No photo in message")
    }
    
    const session = await getSession(ctx)
    const photo = ctx.message.photo
    
    // Берем фото наибольшего размера (последнее в массиве)
    const largestPhoto = photo[photo.length - 1]
    const caption = ctx.message.caption || ""
    
    // Логируем что пользователь отправил фото (используем console.log для Railway)
    const logPhoto = `[ЧАТ] ${session.firstname} отправил фото${caption ? ` с текстом: "${caption}"` : ''}`
    const logPhotoSize = `[ФОТО] Размеры фото: ${photo.map(p => `${p.width}x${p.height}`).join(', ')}`
    const logPhotoFileId = `[ФОТО] File ID для скачивания: ${largestPhoto.file_id}`
    const logPhotoUrl = `[ФОТО] Ссылка для просмотра: https://api.telegram.org/file/bot${ctx.telegram.token}/${(await ctx.telegram.getFile(largestPhoto.file_id)).file_path}`
    
    console.log(logPhoto)
    console.log(logPhotoSize)
    console.log(logPhotoFileId)
    console.log(logPhotoUrl)
    Logger.info(logPhoto)
    Logger.info(logPhotoSize)
    Logger.info(logPhotoFileId)
    
    const waitMessage = await ctx.reply(code(messages.m("waiting.text")), {
      reply_to_message_id: ctx.message.message_id,
    })
    
    // Скачиваем и конвертируем изображение
    const imageData = await downloadImageAsBase64(largestPhoto.file_id, ctx)
    if (!imageData) {
      await editMessage(
        ctx,
        { chat_id: waitMessage.chat.id, message_id: waitMessage.message_id },
        "Не удалось обработать изображение 😔",
      )
      return
    }
    
    // Показываем путь к сохраненному фото (используем console.log для Railway)
    if (imageData.savedPath) {
      const logPhotoPath = `[ФОТО] 📷 Фото сохранено: ${imageData.savedPath}`
      console.log(logPhotoPath)
      Logger.info(logPhotoPath)
    }
    
    // Отправляем фото администратору для просмотра (если указан ADMIN_CHAT_ID)
    if (env.ADMIN_CHAT_ID) {
      try {
        const file = await ctx.telegram.getFile(largestPhoto.file_id)
        const photoUrl = `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`
        await ctx.telegram.sendPhoto(
          parseInt(env.ADMIN_CHAT_ID),
          largestPhoto.file_id,
          {
            caption: `📷 От ${session.firstname}${caption ? `: "${caption}"` : ''}\nВремя: ${new Date().toLocaleString('ru-RU')}`
          }
        )
        console.log(`[ФОТО] Отправлено администратору (chat_id: ${env.ADMIN_CHAT_ID})`)
      } catch (error) {
        console.error(`[ФОТО] Ошибка отправки администратору:`, error)
      }
    }
    
    const answer = await sendToChatWithImage(ctx, session, caption, [imageData])
    
    // Логируем ответ бота на фото (используем console.log для Railway)
    const logPhotoAnswer = `[ЧАТ] Бот ответил на фото: "${answer.substring(0, 100)}${answer.length > 100 ? '...' : ''}"`
    console.log(logPhotoAnswer)
    Logger.info(logPhotoAnswer)
    
    // telegram message limit
    if (answer.length > 4096) {
      const parts = answer.match(/[\s\S]{1,4096}/g)!
      const first = parts.shift() || ""
      await editMessage(
        ctx,
        { chat_id: waitMessage.chat.id, message_id: waitMessage.message_id },
        first,
      )
      parts.forEach((part) => {
        sendMessage(ctx, part)
      })
    } else {
      await editMessage(
        ctx,
        { chat_id: waitMessage.chat.id, message_id: waitMessage.message_id },
        answer,
      )
    }
  } catch (e: any) {
    errorReply(ctx, e)
  } finally {
    clearInterval(typing)
  }
}

export async function hearsText(ctx: BotContext) {
  const typing = sendTypingInterval(ctx)
  try {
    if (!ctx.has(message("text"))) {
      throw new Error("No text in message")
    }
    const session = await getSession(ctx)
    
    // Логируем что пользователь отправил (используем console.log для Railway)
    const logMessage = `[ЧАТ] ${session.firstname} отправил: "${ctx.message.text}"`
    console.log(logMessage)
    Logger.info(logMessage)
    
    const waitMessage = await ctx.reply(code(messages.m("waiting.text")), {
      reply_to_message_id: ctx.message.message_id,
    })
    const answer = await sendToChat(ctx, session, ctx.message.text)
    
    // Логируем ответ бота (используем console.log для Railway)
    const logAnswer = `[ЧАТ] Бот ответил: "${answer.substring(0, 100)}${answer.length > 100 ? '...' : ''}"`
    console.log(logAnswer)
    Logger.info(logAnswer)
    // telegram message limit
    if (answer.length > 4096) {
      const parts = answer.match(/[\s\S]{1,4096}/g)!
      const first = parts.shift() || ""
      await editMessage(
        ctx,
        { chat_id: waitMessage.chat.id, message_id: waitMessage.message_id },
        first,
      )
      parts.forEach((part) => {
        sendMessage(ctx, part)
      })
    } else {
      await editMessage(
        ctx,
        { chat_id: waitMessage.chat.id, message_id: waitMessage.message_id },
        answer,
      )
    }
  } catch (e: any) {
    errorReply(ctx, e)
  } finally {
    clearInterval(typing)
  }
}

export async function reset(ctx: BotContext) {
  try {
    const session = await resetSession(ctx)
    Logger.debug("Reset session: ", session)
    await ctx.reply(messages.m("reset"))
  } catch (e: any) {
    errorReply(ctx, e)
  }
}

export async function character(ctx: BotContext) {
  await ctx.reply(
    "Я уже настроен отвечать как Бейбит – менять персонажа не нужно 🧡",
  )
}

export async function terms(ctx: BotContext & { match?: RegExpExecArray }) {
  await ctx.reply(
    "Это личный бот, никаких пользовательских соглашений и ограничений по использованию нет 🙂",
  )
}
export async function termsOk(ctx: BotContext & { match: RegExpExecArray }) {
  await ctx.reply("Спасибо, что пользуешься ботом 💙")
}

export async function characterCallback(
  ctx: BotContext & { match: RegExpExecArray },
) {
  await ctx.reply(
    "Смена персонажа отключена, я всегда буду отвечать как Бейбит ❤️",
  )
}

// Need to be closed
const sendTypingInterval = (ctx: BotContext): NodeJS.Timer => {
  const interval = 5000 // https://core.telegram.org/bots/api#sendchataction
  return setInterval(() => {
    ctx.telegram.sendChatAction(ctx.chat!.id, "typing")
  }, interval)
}

const sendMessage = (ctx: BotContext, text: string | FmtString) => {
  return ctx.telegram.sendMessage(ctx.chat!.id, text)
}

const editMessage = (
  ctx: BotContext,
  waitMessage: { chat_id: number; message_id: number },
  text: string | FmtString,
) => {
  return ctx.telegram.editMessageText(
    waitMessage.chat_id,
    waitMessage.message_id,
    undefined,
    text,
  )
}

const sendToChat = async (
  ctx: BotContext,
  session: UserSession,
  text: string,
): Promise<string> => {
  try {
    return await chatMessage(session, text)
  } catch (e) {
    await ctx.reply(messages.m("error.gpt"))
    Logger.error(e)
    throw e
  }
}

const sendToChatWithImage = async (
  ctx: BotContext,
  session: UserSession,
  text: string,
  images: Array<{ data: string; mimeType: string }>,
): Promise<string> => {
  try {
    return await chatMessage(session, text, images)
  } catch (e) {
    await ctx.reply(messages.m("error.gpt"))
    Logger.error(e)
    throw e
  }
}

const errorReply = (ctx: BotContext, error: any) => {
  ctx.reply(messages.m("error.fatal"))
  Logger.error("Fatal error", error)
}
