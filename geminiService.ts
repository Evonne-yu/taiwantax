/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
// Import necessary classes and types from the Google GenAI SDK.
// 從 Google GenAI SDK 匯入必要的類別和類型。
import { GoogleGenAI, Chat } from '@google/genai';
// Import the system prompt constant that defines the AI's behavior.
// 匯入定義 AI 行為的系統提示常數。
import { SYSTEM_PROMPT } from '../constants';

// Ensure the API key is available in the environment variables.
// 確保 API 金鑰在環境變數中可用。
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

// Initialize the GoogleGenAI client with the API key.
// 使用 API 金鑰初始化 GoogleGenAI 客戶端。
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Defines the structure for a single grounding source (website).
 * 定義單一參考來源（網站）的結構。
 */
export type GroundingSource = {
  uri: string;
  title: string;
};

/**
 * Defines the structure for the AI's complete response, including text and sources.
 * 定義 AI 的完整回應結構，包含文字和來源。
 */
export type AiResponse = {
  text: string;
  sources: GroundingSource[];
};


/**
 * Creates and returns a new AI chat session.
 * This function initializes a chat with the specified model and system prompt.
 * It also enables the Google Search tool for accessing up-to-date information.
 * @returns {Chat} A new Chat instance.
 *
 * 建立並回傳一個新的 AI 聊天會話。
 * 此函式會使用指定的模型和系統提示初始化聊天。
 * 它還會啟用 Google 搜尋工具以存取最新資訊。
 * @returns {Chat} 一個新的 Chat 實例。
 */
export function getAiChat(): Chat {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      // The system instruction guides the model's persona and responses.
      // 系統指令引導模型的角色和回應。
      systemInstruction: SYSTEM_PROMPT,
      // Enable Google Search for grounding responses in real-time information.
      // 啟用 Google 搜尋以將回應建立在即時資訊的基礎上。
      tools: [{ googleSearch: {} }],
    },
  });
}

/**
 * Sends a prompt to the AI chat session and returns the model's response.
 * @param {Chat} chat - The active chat instance.
 * @param {string} prompt - The user's message to send to the model.
 * @returns {Promise<AiResponse>} A promise that resolves to the AI's response, including text and sources.
 *
 * 將提示傳送到 AI 聊天會話並回傳模型的回應。
 * @param {Chat} chat - 活動中的聊天實例。
 * @param {string} prompt - 要傳送給模型的使用者訊息。
 * @returns {Promise<AiResponse>} 一個解析為 AI 回應的 Promise，包含文字和來源。
 */
export async function getAiResponse(chat: Chat, prompt: string): Promise<AiResponse> {
  try {
    // Send the user's message and wait for the response.
    // 傳送使用者訊息並等待回應。
    const response = await chat.sendMessage({ message: prompt });
    const text = response.text;
    
    // Extract grounding sources from the response metadata.
    // 從回應元資料中擷取參考來源。
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks
        ?.map(chunk => chunk.web)
        .filter(web => web?.uri && web.title)
        .map(web => ({ uri: web!.uri, title: web!.title })) 
        ?? [];
    
    return { text, sources };
  } catch (e) {
    // Log the error for debugging purposes.
    // 記錄錯誤以供偵錯。
    console.error("Error sending message to Gemini:", e);
    // Format a user-friendly error message.
    // 格式化一個使用者友善的錯誤訊息。
    const errorMessage = e instanceof Error ? e.message : String(e);
    return {
      text: `抱歉，與 AI 服務連線時發生錯誤: ${errorMessage}`,
      sources: [],
    };
  }
}