/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat } from '@google/genai';
import { getAiChat, getAiResponse, GroundingSource } from './services/geminiService';
import { MULTI_LANG_MESSAGES } from './constants';

// --- Type definitions for Speech Recognition API ---
// --- 語音辨識 API 的類型定義 ---
// These interfaces provide TypeScript types for the Web Speech API,
// which is not yet fully standardized and may require vendor prefixes.
// 這些介面為 Web Speech API 提供 TypeScript 類型，
// 該 API 尚未完全標準化，可能需要供應商前綴。

/** Represents the event fired when the speech recognition service returns a result. */
/** 代表語音辨識服務回傳結果時觸發的事件。 */
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
/** Represents a list of speech recognition results. */
/** 代表語音辨識結果的列表。 */
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
/** Represents a single recognition match. */
/** 代表單一的辨識匹配。 */
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
/** Represents a single word that has been recognized by the speech recognition service. */
/** 代表語音辨識服務已辨識出的單一詞語。 */
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
/** Represents the event fired when a speech recognition error occurs. */
/** 代表發生語音辨識錯誤時觸發的事件。 */
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
/** Represents the constructor for the SpeechRecognition object. */
/** 代表 SpeechRecognition 物件的建構函式。 */
interface SpeechRecognitionStatic {
  new(): SpeechRecognition;
}
/** Represents the main interface for the Speech Recognition API. */
/** 代表語音辨識 API 的主要介面。 */
interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onstart: () => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}
// Augment the global Window object to include prefixed versions of the SpeechRecognition API.
// 擴充全域 Window 物件以包含帶前綴版本的語音辨識 API。
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

// --- Type Definitions for the App ---
// --- 應用程式的類型定義 ---

/** Represents a single message in the chat history. */
/** 代表聊天歷史記錄中的單一訊息。 */
type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  type: 'welcome' | 'interaction';
  sources?: GroundingSource[];
};

/** Represents the current status of the assistant. */
/** 代表助理的目前狀態。 */
type Status = 'idle' | 'listening' | 'thinking' | 'speaking';

/** Represents the current phase of the conversation. */
/** 代表對話的目前階段。 */
type ConversationPhase = 'pre-start' | 'welcoming' | 'lang-select' | 'chatting' | 'ended';


/** A list of supported languages with their corresponding codes for different APIs. */
/** 支援的語言列表，包含其對應於不同 API 的代碼。 */
const SUPPORTED_LANGUAGES = [
  { code: 'cmn-Hant-TW', name: '中', speechLang: 'zh-TW' },
  { code: 'en-US', name: 'EN', speechLang: 'en-US' },
  { code: 'ja-JP', name: '日', speechLang: 'ja-JP' },
  { code: 'ko-KR', name: '韓', speechLang: 'ko-KR' },
];

// --- Helper Components ---
// --- 輔助元件 ---

/** A reusable avatar component for the AI assistant. */
/** AI 助理的可重用頭像元件。 */
const AssistantAvatar: React.FC = () => (
  <div className="w-10 h-10 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center shadow-md">
    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm3.707 3.293a1 1 0 010 1.414l-1 1a1 1 0 01-1.414-1.414l1-1a1 1 0 011.414 0zM10 16a4 4 0 100-8 4 4 0 000 8zm-6.707-8.707a1 1 0 011.414 0l1 1a1 1 0 01-1.414 1.414l-1-1a1 1 0 010-1.414zM2 10a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm15-1a1 1 0 100 2h1a1 1 0 100-2h-1zM10 18a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1-1z" />
    </svg>
  </div>
);

/** A button component that allows downloading the conversation text. */
/** 允許下載對話文字的按鈕元件。 */
const DownloadButton: React.FC<{ text: string }> = ({ text }) => {
  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tax-ai-response.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleDownload} className="text-gray-400 hover:text-blue-500" aria-label="下載對話紀錄">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
    </button>
  );
};

/** A dynamic microphone icon that changes based on the assistant's status. */
/** 根據助理狀態變化的動態麥克風圖示。 */
const MicIcon: React.FC<{ status: Status }> = ({ status }) => {
  // Shows a spinner when the AI is thinking.
  // AI 思考時顯示旋轉圖示。
  if (status === 'thinking') {
    return (
      <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2V6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 18V22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4.93 4.93L7.76 7.76" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16.24 16.24L19.07 19.07" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12H6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18 12H22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4.93 19.07L7.76 16.24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16.24 7.76L19.07 4.93" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  // Shows a standard microphone icon for other statuses.
  // 其他狀態下顯示標準麥克風圖示。
  return (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07z" clipRule="evenodd" />
    </svg>
  );
};

// --- Message Components ---
// --- 訊息元件 ---

/** A component to display a user's message bubble. */
/** 用於顯示使用者訊息泡泡的元件。 */
const UserMessageBubble: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex justify-end">
        <div className="bg-white text-gray-800 p-3 rounded-2xl rounded-br-none max-w-lg lg:max-w-xl shadow-md border border-gray-200">
            <p className="break-words">{text}</p>
        </div>
    </div>
);

/** A component to display a model's message card, including the avatar and download button. */
/** 用於顯示模型訊息卡的元件，包含頭像和下載按鈕。 */
const ModelMessageCard: React.FC<{ msg: Message, currentLang: string }> = ({ msg, currentLang }) => {
  const langKey = currentLang as keyof typeof MULTI_LANG_MESSAGES.sources;
  const sourcesTitle = MULTI_LANG_MESSAGES.sources[langKey] || MULTI_LANG_MESSAGES.sources['cmn-Hant-TW'];
  
  return (
    <div className="flex items-start gap-3 justify-start">
        <AssistantAvatar />
        <div className="bg-white rounded-2xl rounded-bl-none shadow p-3 border border-gray-200 max-w-lg lg:max-w-xl">
            <p className="break-words text-gray-800">{msg.text}</p>

            {/* Render grounding sources if they exist */}
            {/* 如果存在，則呈現參考來源 */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h4 className="text-xs font-bold text-gray-500 mb-2">{sourcesTitle}</h4>
                <ul className="space-y-1">
                  {msg.sources.map((source, index) => (
                    <li key={index} className="flex items-center gap-2">
                       <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.555a4 4 0 005.656-5.656l-4-4a4 4 0 00-5.656 5.656l1.102 1.101" /></svg>
                       <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate" title={source.title}>
                        {source.title}
                       </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Show download button only for interaction messages, not welcome messages */}
            {/* 僅對互動訊息顯示下載按鈕，歡迎訊息不顯示 */}
            {msg.type === 'interaction' && (
                <div className="flex justify-end mt-2">
                    <DownloadButton text={msg.text} />
                </div>
            )}
        </div>
    </div>
  );
};


// --- Main App Component ---
// --- 主要應用程式元件 ---

/**
 * The main application component that manages state and logic for the tax AI assistant.
 * 管理稅務 AI 助理狀態和邏輯的主要應用程式元件。
 */
const App: React.FC = () => {
  // --- State Management ---
  // --- 狀態管理 ---
  const [messages, setMessages] = useState<Message[]>([]); // Stores the chat history. // 儲存聊天歷史記錄
  const [status, setStatus] = useState<Status>('idle'); // Tracks the assistant's current action. // 追蹤助理目前的動作
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>('pre-start'); // Manages the conversation flow. // 管理對話流程
  const [interimTranscript, setInterimTranscript] = useState(''); // Holds temporary speech recognition results. // 儲存臨時的語音辨識結果
  const [currentLang, setCurrentLang] = useState('cmn-Hant-TW'); // The currently selected language. // 當前選擇的語言
  const [hasStarted, setHasStarted] = useState(false); // Tracks if the user has started the interaction. // 追蹤使用者是否已開始互動
  
  // --- Refs for managing persistent objects and values ---
  // --- 用於管理持久物件和值的 Refs ---
  const recognitionRef = useRef<SpeechRecognition | null>(null); // Holds the SpeechRecognition instance. // 持有 SpeechRecognition 實例
  const aiChatRef = useRef<Chat | null>(null); // Holds the Gemini Chat instance. // 持有 Gemini Chat 實例
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Manages the inactivity timeout. // 管理閒置超時
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null); // Holds the current speech synthesis utterance. // 持有目前的語音合成語句
  const chatContainerRef = useRef<HTMLDivElement | null>(null); // Ref to the chat message container for scrolling. // 用於滾動的聊天訊息容器的 Ref
  const isInitialized = useRef(false); // Tracks if the speech recognition has been initialized. // 追蹤語音辨識是否已初始化
  const stopListeningDeliberately = useRef(false); // Flag to prevent automatic restarts of speech recognition. // 用於防止語音辨識自動重啟的旗標

  // --- Effects ---
  // --- 副作用 ---
  
  // Effect to auto-scroll to the latest message.
  // 自動滾動到最新訊息的副作用。
  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);
  
  // --- Core Functions (memoized with useCallback) ---
  // --- 核心函式 (使用 useCallback 進行記憶化) ---

  /** Adds a new message to the chat history. */
  /** 將新訊息加入聊天歷史記錄。 */
  const addMessage = useCallback((role: 'user' | 'model', text: string, type: 'interaction' | 'welcome' = 'interaction', sources?: GroundingSource[]) => {
    setMessages(prev => {
      // Replace previous welcome message if a new one is added
      // 如果加入新的歡迎訊息，則取代先前的歡迎訊息
      const filteredPrev = type === 'welcome' ? prev.filter(m => m.type !== 'welcome') : prev;
      return [...filteredPrev, { id: `${Date.now()}-${text.substring(0, 10)}`, role, text, type, sources }];
    });
  }, []);

  /** Clears the inactivity timer. */
  /** 清除閒置計時器。 */
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  /** Speaks the given text using the Web Speech API (Text-to-Speech). */
  /** 使用 Web Speech API (文字轉語音) 說出給定的文字。 */
  const speak = useCallback((text: string, lang: string, onEndCallback?: () => void) => {
    if (!window.speechSynthesis) {
        console.warn("Speech synthesis not supported.");
        if (onEndCallback) onEndCallback();
        return;
    };
    
    setStatus('speaking');
    window.speechSynthesis.cancel(); // Cancel any ongoing speech. // 取消任何正在進行的語音

    const textForSpeech = text.replace(/[*#]/g, ''); // Clean text for better pronunciation. // 清理文字以獲得更好的發音
    const utterance = new SpeechSynthesisUtterance(textForSpeech);
    const currentUtterance = utterance;
    utteranceRef.current = currentUtterance;
    
    utterance.lang = lang;

    // Callback for when speech finishes
    // 語音結束時的回呼
    utterance.onend = () => {
      if (utteranceRef.current === currentUtterance) { // Ensure it's not an old utterance. // 確保不是舊的語句
        setStatus('idle');
        utteranceRef.current = null;
        if (onEndCallback) onEndCallback();
      }
    };
    // Callback for speech errors
    // 語音錯誤時的回呼
    utterance.onerror = (e) => {
      const errorEvent = e as SpeechSynthesisErrorEvent;
      if (errorEvent.error !== 'interrupted' && errorEvent.error !== 'canceled') {
         console.error("Speech synthesis error:", errorEvent.error);
      }
      if (utteranceRef.current === currentUtterance) {
        setStatus('idle');
        utteranceRef.current = null;
        if (onEndCallback) onEndCallback();
      }
    };
    
    // Function to find the correct voice and speak
    // 尋找正確語音並說話的函式
    const setVoiceAndSpeak = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', setVoiceAndSpeak);
        const voices = window.speechSynthesis.getVoices();
        
        if (voices.length > 0) {
            let selectedVoice = voices.find(v => v.lang === lang);
            if (!selectedVoice) selectedVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
            
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            } else {
                console.warn(`No voice found for language: ${lang}. Using browser default.`);
            }
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("Voices array is empty even after 'voiceschanged' event. Using browser default voice.");
            window.speechSynthesis.speak(utterance);
        }
    };
    
    // Voices might load asynchronously, so handle that
    // 語音可能會非同步載入，所以要處理這種情況
    if (window.speechSynthesis.getVoices().length > 0) {
        setVoiceAndSpeak();
    } else {
        window.speechSynthesis.addEventListener('voiceschanged', setVoiceAndSpeak);
    }
  }, []);

  /** Stops the speech recognition service. */
  /** 停止語音辨識服務。 */
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
     try {
      stopListeningDeliberately.current = true; // Set flag to prevent auto-restart. // 設定旗標以防止自動重啟
      recognitionRef.current.stop();
      setStatus('idle');
    } catch(e){
      console.warn("Speech recognition couldn't be stopped.", e);
    }
  }, []);
  
  /** Starts the speech recognition service. */
  /** 啟動語音辨識服務。 */
  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      stopListeningDeliberately.current = false;
      
      // Dynamically set the recognition language based on the conversation phase.
      // 根據對話階段動態設定辨識語言。
      if (conversationPhase === 'chatting') {
        recognitionRef.current.lang = SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.speechLang ?? 'zh-TW';
      } else {
        // Use a broad language setting during language selection to catch keywords like "English".
        // 在語言選擇期間使用廣泛的語言設定以捕捉像 "English" 這樣的關鍵字。
        recognitionRef.current.lang = ''; 
      }

      recognitionRef.current.start();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'InvalidStateError') {
        // This can happen if start() is called while it's already running.
        // 如果在 start() 執行時再次呼叫，可能會發生這種情況。
        console.warn("Speech recognition already started, ignoring request.");
      } else {
        console.error("Could not start speech recognition:", e);
        setStatus('idle');
      }
    }
  }, [currentLang, conversationPhase]);

  /** Ends the conversation with a farewell message. */
  /** 以告別訊息結束對話。 */
  const sayFarewell = useCallback(() => {
    setConversationPhase('ended');
    setStatus('idle');
    stopListening();
    clearInactivityTimer();
    const langKey = currentLang as keyof typeof MULTI_LANG_MESSAGES.farewell;
    const message = MULTI_LANG_MESSAGES.farewell[langKey];
    addMessage('model', message, 'interaction');
    const speechLang = SUPPORTED_LANGUAGES.find(l => l.code === currentLang)!.speechLang;
    speak(message, speechLang);
  }, [speak, stopListening, clearInactivityTimer, currentLang, addMessage]);

  /** Handles a user query, sends it to the AI, and processes the response. */
  /** 處理使用者查詢，將其傳送給 AI，並處理回應。 */
  const handleQuery = useCallback(async (query: string) => {
    stopListening();
    clearInactivityTimer();
    addMessage('user', query, 'interaction');
    setStatus('thinking');

    try {
      // Initialize chat session if it doesn't exist.
      // 如果聊天會話不存在，則初始化它。
      if (!aiChatRef.current) {
        aiChatRef.current = getAiChat();
      }
      const { text: responseText, sources } = await getAiResponse(aiChatRef.current!, query);
      
      // The model provides a language tag `[lang: ...]` in its response. Extract it.
      // 模型在其回應中提供語言標籤 `[lang: ...]`。將其擷取出來。
      const langMatch = responseText.match(/\[lang:\s*([a-zA-Z]{2,3}-[a-zA-Z]{2,4})\]$/);
      const detectedLang = langMatch ? langMatch[1] : null;
      const cleanResponse = responseText.replace(/\[lang:\s*([a-zA-Z]{2,3}-[a-zA-Z]{2,4})\]$/, '').trim();

      let speechLang = SUPPORTED_LANGUAGES.find(l => l.code === currentLang)!.speechLang;

      // If a new language is detected and supported, switch to it.
      // 如果偵測到新語言且受支援，則切換到該語言。
      if (detectedLang && SUPPORTED_LANGUAGES.some(l => l.code === detectedLang)) {
        setCurrentLang(detectedLang);
        speechLang = SUPPORTED_LANGUAGES.find(l => l.code === detectedLang)!.speechLang;
      }
      addMessage('model', cleanResponse, 'interaction', sources);
      
      // Speak the response and set up the next listening cycle.
      // 說出回應並設定下一個聆聽週期。
      speak(cleanResponse, speechLang, () => {
          inactivityTimerRef.current = setTimeout(sayFarewell, 30000); // 30s inactivity timeout. // 30秒閒置超時
          startListening();
      });

    } catch (error) {
      console.error("Error in handleQuery:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      addMessage('model', `抱歉，處理您的請求時發生錯誤: ${errorMessage}`);
      setStatus('idle');
      startListening(); // Allow user to try again. // 允許使用者重試
    }
  }, [stopListening, clearInactivityTimer, addMessage, currentLang, speak, startListening, sayFarewell]);
  
  /** Processes the user's spoken language choice. */
  /** 處理使用者說出的語言選擇。 */
  const processLanguageChoice = useCallback(async (transcript: string) => {
    stopListening();
    const cleanedTranscript = transcript.toLowerCase().trim().replace(/。/g, '');
    let langCode: string | null = null;

    // Detect language keywords
    // 偵測語言關鍵字
    if (cleanedTranscript.includes('中') || cleanedTranscript.includes('中文')) {
      langCode = 'cmn-Hant-TW';
    } else if (cleanedTranscript.includes('english') || cleanedTranscript.includes('en') || cleanedTranscript.includes('英文')) {
      langCode = 'en-US';
    } else if (cleanedTranscript.includes('日') || cleanedTranscript.includes('日本') || cleanedTranscript.includes('日本語')) {
      langCode = 'ja-JP';
    } else if (cleanedTranscript.includes('韓') || cleanedTranscript.includes('korea') || cleanedTranscript.includes('한국어') || cleanedTranscript.includes('韓文')) {
      langCode = 'ko-KR';
    }

    if (langCode) {
      const newLang = langCode;
      setCurrentLang(newLang);
      setConversationPhase('chatting'); // Move to the main chat phase. // 移至主要聊天階段
      
      // Get the appropriate welcome message for the chosen language
      // 取得所選語言的適當歡迎訊息
      const langKey = newLang as keyof typeof MULTI_LANG_MESSAGES.welcome;
      const welcomeMsg = MULTI_LANG_MESSAGES.welcome[langKey];
      
      addMessage('model', welcomeMsg, 'welcome');
      
      // Speak the welcome message and start listening for the user's query
      // 說出歡迎訊息並開始聆聽使用者的查詢
      speak(welcomeMsg, SUPPORTED_LANGUAGES.find(l => l.code === newLang)!.speechLang, () => {
        inactivityTimerRef.current = setTimeout(sayFarewell, 30000);
        startListening();
      });
    } else {
      // If language choice was not understood, ask again.
      // 如果無法理解語言選擇，則再次詢問。
      const retryMsg = MULTI_LANG_MESSAGES.languageSelectRetry['cmn-Hant-TW'];
      addMessage('model', retryMsg, 'interaction');
      speak(retryMsg, 'zh-TW', () => {
        startListening();
      });
    }
  }, [stopListening, addMessage, speak, startListening, sayFarewell]);

  /** Handles the result from the speech recognition service. */
  /** 處理來自語音辨識服務的結果。 */
  const handleRecognitionResult = useCallback((event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';
      // Concatenate results
      // 串連結果
      for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
          } else {
              interim += event.results[i][0].transcript;
          }
      }

      setInterimTranscript(interim);

      // Once a final transcript is available, process it.
      // 一旦有最終的文字稿，就處理它。
      if (finalTranscript) {
          setInterimTranscript('');
          clearInactivityTimer();
          if (conversationPhase === 'lang-select') {
              processLanguageChoice(finalTranscript);
          } else if (conversationPhase === 'chatting') {
              handleQuery(finalTranscript);
          }
      }
  }, [clearInactivityTimer, conversationPhase, processLanguageChoice, handleQuery]);
  
  /** Initializes the SpeechRecognition instance. */
  /** 初始化 SpeechRecognition 實例。 */
  const initializeRecognition = useCallback(() => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
          console.error("Speech Recognition API not supported in this browser.");
          addMessage('model', '您的瀏覽器不支援語音辨識功能。');
          return;
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.interimResults = true; // Get results as they are being recognized. // 在辨識過程中取得結果
      recognitionRef.current.continuous = false; // Stop after a pause in speech. // 語音暫停後停止
  }, [addMessage]);
  
  // Effect to attach event listeners to the speech recognition instance.
  // This ensures they are always up-to-date and don't have stale closures.
  // 將事件監聽器附加到語音辨識實例的副作用。
  // 這確保它們始終是最新的，並且沒有過時的閉包。
  useEffect(() => {
    if (!recognitionRef.current) return; // Don't attach if not initialized. // 如果未初始化，則不附加

    const recognition = recognitionRef.current;

    recognition.onstart = () => {
        setStatus('listening');
    };

    // `onend` handles restarting the listener if needed.
    // `onend` 處理需要時重新啟動監聽器。
    recognition.onend = () => {
      setStatus('idle');
      // Automatically restart listening unless it was stopped deliberately or the conversation has ended.
      // 自動重新啟動聆聽，除非是刻意停止或對話已結束。
      if (!stopListeningDeliberately.current && conversationPhase !== 'ended' && hasStarted) {
        startListening();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error, event.message);
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
            // Ignore these common, non-fatal errors. 'onend' will handle restarts.
            // 忽略這些常見的非致命錯誤。'onend' 將處理重新啟動。
        } else {
            setStatus('idle');
        }
    };

    // The main result handler.
    // 主要的結果處理器。
    recognition.onresult = handleRecognitionResult;
    
    // Cleanup function to remove listeners when the component unmounts.
    // 元件卸載時移除監聽器的清理函式。
    return () => {
      if (recognition) {
        recognition.onresult = null;
        recognition.onstart = null;
        recognition.onend = null;
        recognition.onerror = null;
      }
    };
  }, [hasStarted, conversationPhase, handleRecognitionResult, startListening]);
  
  /** Starts the initial welcome sequence. */
  /** 開始初始的歡迎序列。 */
  const startWelcomeSequence = useCallback(async () => {
    setConversationPhase('welcoming');

    const welcomeMsg = MULTI_LANG_MESSAGES.welcome['cmn-Hant-TW'];
    addMessage('model', welcomeMsg, 'welcome');

    // After speaking the welcome message, move to language selection.
    // 說完歡迎訊息後，移至語言選擇。
    speak(welcomeMsg, 'zh-TW', () => {
        setConversationPhase('lang-select');
        startListening();
    });
  }, [addMessage, speak, startListening]);

  /** Handles clicks on the main microphone button. */
  /** 處理主麥克風按鈕的點擊事件。 */
  const handleMicClick = useCallback(() => {
    if (!hasStarted) {
      // First click: initialize and start the welcome sequence.
      // 第一次點擊：初始化並開始歡迎序列。
      setHasStarted(true);
      if (!isInitialized.current) {
        initializeRecognition();
        isInitialized.current = true;
      }
      startWelcomeSequence();
    } else {
      // Subsequent clicks: toggle listening state.
      // 後續點擊：切換聆聽狀態。
      if (status === 'listening') {
        stopListening();
      } else if (status === 'idle' && conversationPhase !== 'ended') {
        startListening();
      }
    }
  }, [hasStarted, status, conversationPhase, initializeRecognition, startWelcomeSequence, stopListening, startListening]);
  
  /** Returns the appropriate status text based on the current state. */
  /** 根據目前狀態回傳適當的狀態文字。 */
  const getStatusText = (phase: ConversationPhase, status: Status, interim: string, lang: string): string => {
      if (interim) return interim; // Show interim transcript if available. // 如果有臨時文字稿，則顯示它
      const langKey = lang as keyof (typeof MULTI_LANG_MESSAGES.followUp & typeof MULTI_LANG_MESSAGES.farewell);
      const statusTextMap = {
        'cmn-Hant-TW': { listen: '請聽我說...', think: '思考中...', speak: '正在為您回覆...', followup: MULTI_LANG_MESSAGES.followUp['cmn-Hant-TW'], farewell: MULTI_LANG_MESSAGES.farewell['cmn-Hant-TW'], langSelect: '請說出您的語言...' },
        'en-US': { listen: 'Listening...', think: 'Thinking...', speak: 'Replying...', followup: MULTI_LANG_MESSAGES.followUp['en-US'], farewell: MULTI_LANG_MESSAGES.farewell['en-US'], langSelect: 'Please state your language...' },
        'ja-JP': { listen: 'お聞きしています...', think: '考え中...', speak: '応答中...', followup: MULTI_LANG_MESSAGES.followUp['ja-JP'], farewell: MULTI_LANG_MESSAGES.farewell['ja-JP'], langSelect: 'ご希望の言語を教えてください...' },
        'ko-KR': { listen: '듣고 있습니다...', think: '생각 중...', speak: '답변 중...', followup: MULTI_LANG_MESSAGES.followUp['ko-KR'], farewell: MULTI_LANG_MESSAGES.farewell['ko-KR'], langSelect: '언어를 말씀해주세요...' },
      };
      const texts = statusTextMap[langKey] || statusTextMap['cmn-Hant-TW'];

      switch (phase) {
          case 'pre-start': return '點擊麥克風開始';
          case 'welcoming': return '歡迎...';
          case 'lang-select': return texts.langSelect;
          case 'chatting':
              switch (status) {
                  case 'listening': return texts.listen;
                  case 'thinking': return texts.think;
                  case 'speaking': return texts.speak;
                  case 'idle': return texts.followup;
              }
          case 'ended': return texts.farewell;
          default: return '準備就緒';
      }
  };
  
  // --- Render Logic ---
  // --- 渲染邏輯 ---

  // Render the initial landing screen before the user starts the interaction.
  // 在使用者開始互動前，渲染初始的登陸畫面。
  if (!hasStarted) {
    return (
        <main
            onClick={handleMicClick}
            className="w-screen h-screen bg-blue-200 flex flex-col items-center justify-center text-center cursor-pointer p-8 relative font-sans"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleMicClick()}
            aria-label="Start Taiwan Tax AI Assistant"
        >
            <div className="space-y-12">
                <div className="text-gray-800">
                    <h1 className="text-4xl font-bold mb-2">歡迎使用臺灣稅務 AI 助理</h1>
                    <p className="text-lg text-gray-600">請點擊螢幕任何地方以啟動語音服務</p>
                </div>
                <div className="text-gray-800">
                    <h2 className="text-3xl font-bold mb-2">Welcome to the Taiwan Tax AI Assistant</h2>
                    <p className="text-md text-gray-600">Please click anywhere on the screen to activate the voice service</p>
                </div>
                <div className="text-gray-800">
                    <h2 className="text-3xl font-bold mb-2">台湾税務AIアシスタントへようこそ</h2>
                    <p className="text-md text-gray-600">画面の任意の場所をクリックして、音声サービスを有効にしてください</p>
                </div>
                <div className="text-gray-800">
                    <h2 className="text-3xl font-bold mb-2">대만 세무 AI 어시스턴트 사용을 환영합니다</h2>
                    <p className="text-md text-gray-600">음성 서비스를 활성화하려면 화면 아무 곳이나 클릭하십시오</p>
                </div>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); handleMicClick(); }}
                className="absolute bottom-10 right-10 w-20 h-20 bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                aria-label="Start voice assistant"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400">
                    <circle cx="6" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="18" cy="12" r="1.5" fill="currentColor"/>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mt-1 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,0L14.5,9.5L24,12L14.5,14.5L12,24L9.5,14.5L0,12L9.5,9.5L12,0Z"/>
                </svg>
            </button>
        </main>
    );
  }

  // Render the main chat interface once the interaction has started.
  // 互動開始後，渲染主聊天介面。
  return (
      <main className="w-screen h-screen bg-blue-100 flex items-center justify-center font-sans">
          <div className="w-full max-w-2xl h-full sm:h-[90vh] sm:max-h-[700px] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
              <header className="bg-white border-b border-gray-200 p-4">
                  <h1 className="text-xl font-bold text-gray-800 text-center">台灣稅務諮詢 AI 助理</h1>
              </header>
              <div ref={chatContainerRef} className="chat-container flex-1 bg-gray-50">
                  {/* Map over messages and render the appropriate component */}
                  {/* 遍歷訊息並渲染相應的元件 */}
                  {messages.map((msg) => (
                      msg.role === 'user'
                        ? <UserMessageBubble key={msg.id} text={msg.text} />
                        : <ModelMessageCard key={msg.id} msg={msg} currentLang={currentLang} />
                  ))}
              </div>
              <footer className="w-full p-4 bg-white border-t border-gray-200 flex flex-col items-center justify-center gap-3">
                  <button
                      className={`mic-button ${status === 'listening' ? 'mic-listening' : status === 'thinking' ? 'mic-thinking' : 'mic-idle'}`}
                      onClick={handleMicClick}
                      disabled={conversationPhase === 'ended' || status === 'speaking'}
                      aria-label={status === 'listening' ? "停止錄音" : "開始錄音"}
                  >
                      <MicIcon status={status} />
                  </button>
                  <p className="text-gray-600 text-center text-sm min-h-[20px]">
                    {getStatusText(conversationPhase, status, interimTranscript, currentLang)}
                  </p>
              </footer>
          </div>
      </main>
  );
};

export default App;