import { add as addMessageToHistory, getGPTMessages } from "./history"
import { openai, geminiForImages } from "./openai"
import { UserSession } from "./types/app"
import { ChatRole, GPTMessage } from "./types/chat"
import Logger from "js-logger"

// chatMessage adds a message to the history, sends a message to the GPT chat, the response from it is also saved to the history
export const chatMessage = async (
  session: UserSession,
  text: string,
  images?: Array<{ data: string; mimeType: string }>,
): Promise<string> => {
  // Если есть изображения, добавляем текст с описанием
  const messageText = images && images.length > 0 
    ? (text || "Что изображено на этой фотографии?")
    : text

  session.history = addMessageToHistory(session.history, {
    content: messageText,
    role: ChatRole.User,
    tokens: 0,
  }).history

  let chatMessages: GPTMessage[] = getGPTMessages(session.history)
  if (session.character) {
    // Цhen using the character, the total tokens in fact will be greater than in history.
    // This is not so bad, it's just that the story will be able to accommodate a little less messages,
    // but there will be no problem with limits
    chatMessages = [
      {
        role: ChatRole.System,
        content: session.character,
      },
      ...chatMessages,
    ]
  }

  // Если есть изображения и используется Groq, используем Gemini для обработки изображений
  // Если Groq не используется, используем основной клиент (который уже Gemini)
  const clientToUse = images && images.length > 0 && geminiForImages 
    ? geminiForImages 
    : openai
  
  const replyText = await clientToUse.chat(session.userId, chatMessages, images)
  if (!replyText) {
    Logger.error("[ЧАТ] AI вернул пустой ответ")
    throw new Error("AI response error")
  }
  const result = addMessageToHistory(
    session.history,
    {
      content: replyText,
      role: ChatRole.Assistant,
      tokens: 0,
    },
    0,
  )
  session.history = result.history
  return replyText
}
