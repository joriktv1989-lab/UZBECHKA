import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Send, Volume2, VolumeX, X, MessageSquare, Sparkles, Bot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Message {
  role: 'user' | 'jarvis';
  text: string;
}

export const Jarvis: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [activeAgent, setActiveAgent] = useState<'jarvis' | 'uzbechka'>('jarvis');
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const recognition = useRef<any>(null);
  const synth = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'ru-RU'; // Default to Russian as per user request context

      recognition.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSend(transcript);
      };

      recognition.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }

    synth.current = window.speechSynthesis;

    return () => {
      if (recognition.current) recognition.current.stop();
      if (synth.current) synth.current.cancel();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const speak = (text: string) => {
    if (!synth.current || isMuted) return;
    
    synth.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synth.current.speak(utterance);
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const endpoint = activeAgent === 'jarvis' ? '/api/ai/jarvis' : '/api/ai/uzbechka';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          context: {
            userRole: user?.role,
            userName: user?.name,
            currentLocation: 'Bukhara',
            agent: activeAgent
          }
        })
      });

      const data = await response.json();
      const aiMsg: Message = { role: activeAgent as any, text: data.text };
      setMessages(prev => [...prev, aiMsg]);
      speak(data.text);
    } catch (error) {
      console.error('AI error:', error);
      const errorMsg: Message = { role: activeAgent as any, text: 'Извините, сэр. Мои системы временно недоступны.' };
      setMessages(prev => [...prev, errorMsg]);
      speak(errorMsg.text);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognition.current?.stop();
    } else {
      setIsListening(true);
      recognition.current?.start();
    }
  };

  return (
    <>
      {/* Floating Jarvis Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-uzum-primary text-white shadow-2xl flex items-center justify-center z-50 border-4 border-white/20 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-uzum-primary to-blue-400 opacity-50 animate-pulse" />
        <Sparkles className={`w-8 h-8 relative z-10 ${isSpeaking ? 'animate-bounce' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-3xl shadow-2xl z-50 flex flex-col border border-gold/20 overflow-hidden"
          >
            {/* Header */}
            <div className={`p-4 text-white flex items-center justify-between transition-colors ${activeAgent === 'jarvis' ? 'bg-uzum-primary' : 'bg-gold'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  {activeAgent === 'jarvis' ? <Sparkles className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold">{activeAgent === 'jarvis' ? 'Jarvis AI' : 'Uzbechka AI'}</h3>
                  <p className="text-[10px] opacity-80">Online • {activeAgent === 'jarvis' ? 'System Architect' : 'Operations AI'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveAgent(activeAgent === 'jarvis' ? 'uzbechka' : 'jarvis')}
                  className="p-2 hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/20"
                >
                  Switch to {activeAgent === 'jarvis' ? 'Uzbechka' : 'Jarvis'}
                </button>
                <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 rounded-lg">
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-beige/30">
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-4">
                  <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-10 h-10 text-gold" />
                  </div>
                  <p className="text-sm text-gray-500 italic">"Здравствуйте, сэр. Чем я могу помочь вам сегодня?"</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-uzum-primary text-white rounded-tr-none' 
                      : msg.role === 'jarvis'
                        ? 'bg-white text-gray-800 shadow-md border border-blue-100 rounded-tl-none'
                        : 'bg-white text-gray-800 shadow-md border border-gold/20 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200">
                <button
                  onClick={toggleListening}
                  className={`p-3 rounded-xl transition-colors ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-gray-200 text-gray-500'
                  }`}
                >
                  <Mic size={20} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                  placeholder="Спросите Джарвиса..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                />
                <button
                  onClick={() => handleSend(input)}
                  className="p-3 bg-uzum-primary text-white rounded-xl hover:bg-uzum-primary/90"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
