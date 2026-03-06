import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useLanguage } from '../context/LanguageContext';
import { Sparkles, Send, Bot, User, Loader2, AlertCircle, Volume2, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminAIProps {
  stats: any;
  orders: any[];
  products: any[];
  users: any[];
}

export const AdminAI: React.FC<AdminAIProps> = ({ stats, orders, products, users }) => {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognition = useRef<any>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'ru-RU';

      recognition.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript);
        setIsListening(false);
      };

      recognition.current.onerror = () => setIsListening(false);
      recognition.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognition.current?.stop();
    } else {
      setIsListening(true);
      recognition.current?.start();
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMessage = prompt;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setPrompt('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const context = `
        Current App State:
        - Total Revenue: ${stats.revenue}
        - Total Orders: ${stats.orders}
        - Total Users: ${stats.users}
        - Products Count: ${products.length}
        - Recent Orders: ${JSON.stringify(orders.slice(0, 5).map(o => ({ id: o.id, status: o.orderStatus, total: o.totalPrice })))}
        - Categories: ${JSON.stringify(stats.salesByCategory)}
        
        You are an AI Assistant for the "Uzbechka" food delivery app admin panel. 
        Your goal is to help the admin manage the app, analyze sales, and identify potential errors or improvements.
        Answer in the language of the user's prompt (Russian or Uzbek).
        Keep your answers concise and professional.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `${context}\n\nUser Question: ${userMessage}`,
      });

      const aiText = response.text || "Sorry, I couldn't generate a response.";
      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "Error connecting to AI service. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  const speak = async (text: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say in ${text.match(/[а-яА-Я]/) ? 'Russian' : 'Uzbek'}: ${text}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audio.play();
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = text.match(/[а-яА-Я]/) ? 'ru-RU' : 'uz-UZ';
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error("TTS Error:", error);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = text.match(/[а-яА-Я]/) ? 'ru-RU' : 'uz-UZ';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/20">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="p-4 bg-white rounded-3xl shadow-sm border border-stone-100">
              <Bot size={48} className="text-gold" />
            </div>
            <div>
              <h4 className="font-bold text-stone-800">How can I help you today?</h4>
              <p className="text-sm text-stone-500 max-w-xs mx-auto mt-2">
                I can analyze your sales data, suggest new products, or help you fix errors in your catalog.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
              <button 
                onClick={() => setPrompt("Analyze my sales data for the last week")}
                className="p-3 text-xs font-bold text-stone-600 bg-white border border-stone-100 rounded-xl hover:border-gold transition-all text-left"
              >
                📊 Analyze sales data
              </button>
              <button 
                onClick={() => setPrompt("Are there any errors in my product catalog?")}
                className="p-3 text-xs font-bold text-stone-600 bg-white border border-stone-100 rounded-xl hover:border-gold transition-all text-left"
              >
                ⚠️ Check for catalog errors
              </button>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-4 rounded-2xl flex gap-3 ${
                msg.role === 'user' 
                  ? 'bg-gold text-white rounded-tr-none' 
                  : 'bg-white border border-stone-100 text-stone-800 rounded-tl-none shadow-sm'
              }`}>
                {msg.role === 'ai' && <Bot size={18} className="shrink-0 mt-1 text-gold" />}
                <div className="flex-1">
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </div>
                  {msg.role === 'ai' && (
                    <button 
                      onClick={() => speak(msg.text)}
                      className="mt-2 p-1.5 bg-stone-50 text-stone-400 rounded-lg hover:text-gold transition-all"
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>
                {msg.role === 'user' && <User size={18} className="shrink-0 mt-1" />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-gold" />
              <span className="text-sm text-stone-500 font-medium">{t('aiThinking')}</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleAsk} className="p-4 bg-white border-t border-stone-100">
        <div className="relative flex gap-2">
          <button
            type="button"
            onClick={toggleListening}
            className={`p-4 rounded-2xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}
          >
            <Mic size={20} />
          </button>
          <div className="relative flex-1">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('askAI')}
              className="w-full p-4 pr-14 rounded-2xl bg-stone-50 border-none outline-none focus:ring-2 focus:ring-gold/20 transition-all font-medium text-sm"
            />
            <button
              type="submit"
              disabled={!prompt.trim() || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gold text-white rounded-xl shadow-lg shadow-gold/20 disabled:opacity-50 transition-all"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
