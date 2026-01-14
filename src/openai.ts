import Logger from "js-logger"
import { env } from "./env"
import { GoogleGenerativeAI } from "@google/generative-ai"
import Groq from "groq-sdk"
import { GPTMessage, ChatRole } from "./types/chat"
import config from "config"

const defaultModel = "gemini-flash-latest"
const defaultGroqModel = "llama-3.3-70b-versatile"
const params = config.has("gpt_params") ? (config.get("gpt_params") as any) : {}
const modelName = params.model || defaultModel
const groqModelName = params.groq_model || defaultGroqModel

class GeminiClient {
  private model

  constructor(apiKey: string, modelName: string) {
    const client = new GoogleGenerativeAI(apiKey)
    this.model = client.getGenerativeModel({ model: modelName })
  }

  async chat(user: string, messages: GPTMessage[], images?: Array<{ data: string; mimeType: string }>): Promise<string | null> {
    try {
      // Находим индекс последнего пользовательского сообщения
      let lastUserMessageIndex = -1
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === ChatRole.User) {
          lastUserMessageIndex = i
          break
        }
      }

      const contents = messages.map((m, index) => {
        const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = []
        
        // Если это последнее сообщение пользователя и есть изображения, добавляем их
        if (m.role === ChatRole.User && index === lastUserMessageIndex && images && images.length > 0) {
          // Добавляем текст, если он есть
          if (m.content) {
            parts.push({ text: m.content })
          }
          // Добавляем изображения
          images.forEach(img => {
            parts.push({
              inlineData: {
                data: img.data,
                mimeType: img.mimeType
              }
            })
          })
        } else {
          // Обычное текстовое сообщение
          parts.push({ text: m.content })
        }

        return {
          role: m.role === ChatRole.Assistant ? "model" : "user",
          parts,
        }
      })

      const result = await this.model.generateContent({
        contents,
      })

      return result.response.text()
    } catch (e: any) {
      Logger.error(`[Gemini] Error while chat completion`, e)
      if (e.message) {
        Logger.error(`[Gemini] Error message: ${e.message}`)
      }
      if (e.response) {
        Logger.error(`[Gemini] Error response:`, e.response)
      }
      return null
    }
  }

  // Голосовые сообщения в этой версии не поддерживаются
  async transcription(_filename: string): Promise<string> {
    throw new Error("[Gemini] Transcription is not implemented in this bot")
  }
}

class GroqClient {
  private client
  private modelName: string

  constructor(apiKey: string, modelName: string) {
    this.client = new Groq({ apiKey })
    this.modelName = modelName
  }

  async chat(user: string, messages: GPTMessage[], images?: Array<{ data: string; mimeType: string }>): Promise<string | null> {
    try {
      // Находим system сообщение и отделяем его
      const systemMessage = messages.find(m => m.role === ChatRole.System)
      const nonSystemMessages = messages.filter(m => m.role !== ChatRole.System)
      
      // Конвертируем сообщения в формат Groq
      const groqMessages = nonSystemMessages.map((m, index) => {
        const role = m.role === ChatRole.Assistant ? "assistant" : "user"
        
        // Groq не поддерживает изображения, поэтому просто добавляем текстовое описание
        if (m.role === ChatRole.User && images && images.length > 0 && index === nonSystemMessages.length - 1) {
          const imageText = images.length > 0 ? " [Пользователь отправил изображение]" : ""
          return {
            role,
            content: m.content + imageText
          }
        }
        
        return {
          role,
          content: m.content
        }
      })

      // Добавляем system сообщение как первое сообщение в массиве (Groq требует role: "system")
      if (systemMessage) {
        groqMessages.unshift({
          role: "system",
          content: systemMessage.content
        })
      }

      const completion = await this.client.chat.completions.create({
        model: this.modelName,
        messages: groqMessages as any,
        temperature: params.temperature || 1,
        top_p: params.top_p || 0.95,
      })

      return completion.choices[0]?.message?.content || null
    } catch (e: any) {
      Logger.error(`[Groq] Error while chat completion`, e)
      return null
    }
  }

  async transcription(_filename: string): Promise<string> {
    throw new Error("[Groq] Transcription is not implemented in this bot")
  }
}

// Автоматически выбираем клиент: Groq приоритетнее, если доступен API ключ
// Но для изображений всегда используем Gemini, так как Groq не поддерживает vision
let client: GeminiClient | GroqClient
let geminiClient: GeminiClient | null = null

if (env.GROQ_API_KEY) {
  Logger.info("[AI] Using Groq API for text, Gemini API for images")
  client = new GroqClient(env.GROQ_API_KEY, groqModelName)
  geminiClient = new GeminiClient(env.GEMINI_API_KEY, modelName) // Для изображений
} else {
  Logger.info("[AI] Using Gemini API")
  client = new GeminiClient(env.GEMINI_API_KEY, modelName)
}

// Экспортируем клиенты
export const openai = client
export const geminiForImages = geminiClient
