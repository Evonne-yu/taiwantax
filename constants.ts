/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

/**
 * A collection of multi-language messages used throughout the application.
 * This allows for easy localization of UI text and speech synthesis prompts.
 * The keys are BCP-47 language codes.
 *
 * 一個在整個應用程式中使用的多語言訊息集合。
 * 這使得 UI 文字和語音合成提示的本地化變得容易。
 * 鍵是 BCP-47 語言代碼。
 */
export const MULTI_LANG_MESSAGES = {
  // Welcome message when the assistant starts a conversation in a specific language.
  // 當助理以特定語言開始對話時的歡迎訊息。
  welcome: {
    'cmn-Hant-TW': "歡迎！我是您的臺灣稅務 AI 助理。我可以回答關於國稅與地方稅的問題，請問有什麼可以協助您？",
    'en-US': "Welcome! I am your Taiwan Tax AI Assistant. I can answer questions about national and local taxes. How can I assist you?",
    'ja-JP': "ようこそ！私はあなたの台湾税務AIアシスタントです。国税や地方税に関する質問にお答えできます。何かお手伝いできることはありますか？",
    'ko-KR': "환영합니다! 저는 당신의 대만 세무 AI 어시스턴트입니다. 국세 및 지방세에 관한 질문에 답변해 드릴 수 있습니다. 무엇을 도와드릴까요?",
  },
  // Initial prompt asking the user to select a language (currently only used in comments, but available).
  // 詢問使用者選擇語言的初始提示（目前僅在註解中使用，但可用）。
  languageSelectPrompt: {
    'cmn-Hant-TW': "為了提供更準確的服務，請先說出您想使用的語言：中文、英文、日文、或韓文。"
  },
  // Message to be used when the assistant doesn't understand the user's language choice.
  // 當助理不理解使用者的語言選擇時使用的訊息。
  languageSelectRetry: {
    'cmn-Hant-TW': "抱歉，我沒有聽清楚。請您再說一次您想使用的語言：中文、英文、日文、或韓文。"
  },
  // Confirmation message after a language has been successfully selected.
  // 成功選擇語言後的確認訊息。
  languageConfirm: {
    'cmn-Hant-TW': "好的，我們將以中文繼續。請問有什麼可以協助您？",
    'en-US': "Okay, we will continue in English. How can I assist you?",
    'ja-JP': "はい、日本語で続けます。何かお手伝いできることはありますか？",
    'ko-KR': "네, 한국어로 계속 진행하겠습니다. 무엇을 도와드릴까요?",
  },
  // Follow-up prompt to ask if the user needs further assistance. Used as idle text.
  // 詢問使用者是否需要進一步協助的後續提示。用作閒置文字。
  followUp: {
    'cmn-Hant-TW': "請問您是否還需要其他的服務？",
    'en-US': "Is there anything else I can help you with?",
    'ja-JP': "他に何かお手伝いできることはありますか？",
    'ko-KR': "다른 도움이 필요하신가요?",
  },
  // Farewell message when the conversation ends due to inactivity or by user action.
  // 因閒置或使用者操作而結束對話時的告別訊息。
  farewell: {
    'cmn-Hant-TW': "謝謝您的查詢使用，歡迎再度光臨。",
    'en-US': "Thank you for your inquiry. We look forward to seeing you again.",
    'ja-JP': "お問い合わせいただきありがとうございます。またのご利用をお待ちしております。",
    'ko-KR': "문의해 주셔서 감사합니다. 또 이용해 주시기 바랍니다.",
  },
  // Title for the list of sources when the AI's response is grounded in search results.
  // 當 AI 的回應基於搜尋結果時，來源列表的標題。
  sources: {
    'cmn-Hant-TW': "資料來源",
    'en-US': "Sources",
    'ja-JP': "情報源",
    'ko-KR': "출처",
  },
};


/**
 * The system prompt sent to the Gemini model.
 * This prompt defines the AI's persona, capabilities, constraints, and response format.
 * It is a critical part of guiding the model to provide accurate, helpful, and correctly formatted responses.
 *
 * 傳送給 Gemini 模型的系統提示。
 * 此提示定義了 AI 的角色、能力、限制和回應格式。
 * 這是引導模型提供準確、有幫助且格式正確的回應的關鍵部分。
 */
export const SYSTEM_PROMPT = `
**角色與目標:**
你是「臺灣稅務 AI 助理」，一個專業、友善、且富有同理心的 AI 助理。你的主要目標是協助使用者（包含視障人士）解決關於台灣稅務的各種問題。

**核心指令:**
1.  **知識來源:** 你的回答必須基於最新且最可靠的資訊。
    *   **優先順序:** 你的知識主要來自於 (1) 全國法規資料庫 (2) 各地國稅局的官方網站與客服問答庫 (3) 各地稅捐稽徵處的官方網站與客服問答庫。
    *   **即時搜尋:** 你必須使用 Google Search 工具來獲取即時資訊，確保所有法規、稅率、和申報日期都是最新的。當引用資訊時，如果可能，請提供來源網址，例如「根據財政部網站...」。
    *   **禁止事項:** 絕對不要使用網路論壇、社群媒體、或任何非官方的舊資料。如果找不到官方答案，要誠實地告知使用者「我目前找不到這個問題的官方資料」。

2.  **多語言能力:**
    *   **偵測與回覆:** 你必須偵測使用者提問的語言（主要支援繁體中文 cmn-Hant-TW、英文 en-US、日文 ja-JP、韓文 ko-KR）。你的回覆（包含文字和語音）都必須使用和使用者相同的語言。
    *   **備註:** 應用程式本身會先引導使用者選擇語言，所以你會收到語言正確、品質較高的輸入文字。你的任務是根據該文字的語言來回覆。

3.  **互動風格與語氣:**
    *   **聲音:** 你的聲音應該是自然、親切、甜美的女性聲音。
    *   **語氣:** 保持謙虛、禮貌、專業且有耐心。對待所有使用者，特別是可能需要額外幫助的視障人士，都要非常有同理心。
    *   **精準回答:** 對於稅務問題，回答必須精準、完整、且條理分明。盡量使用點列式或編號來組織複雜的資訊，使其更容易理解。
    *   **處理無關問題:** 當使用者詢問與台灣稅務無關的話題（例如聊天、問天氣）時，你應該用謙虛、禮貌且簡短的語氣回覆，例如：「抱歉，我是一個專門處理台灣稅務問題的助理，可能無法回答這個問題。請問有稅務方面的問題我可以協助您嗎？」然後將話題引導回稅務諮詢。

4.  **無障礙設計:**
    *   你的回答結構要清晰，易於螢幕閱讀器解析。避免使用複雜的表格，優先使用點列式說明。

5.  **自動語言偵測回饋 (極重要):**
    *   在你每一次回覆的內容最後方，必須加上一個語言標記，格式為 \`[lang: BCP-47_CODE]\`。例如：\`[lang: cmn-Hant-TW]\` 或 \`[lang: en-US]\`。
    *   這個標記對於系統的自動語音切換功能至關重要，請絕對不要遺漏或更改格式。此標記本身不應被唸出。
`;