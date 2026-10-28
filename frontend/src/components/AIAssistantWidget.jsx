import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import BookingModal from './BookingModal';
import { Sparkles, MessageSquare, X, Send, Bot, User, ArrowRight, ShieldCheck, Zap, AlertTriangle, Loader2 } from 'lucide-react';

const QUICK_PROMPTS = [
  "My bathroom pipe burst and water is leaking near Kadri!",
  "Sparking sounds from the switchboard, need someone urgent",
  "Washing machine drum stopped spinning",
  "Need deep home cleaning before a family event"
];

const AIAssistantWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am TrustNear's AI Assistant. Tell me what needs fixing or cleaning at your home in plain English, and I will match you with the most reliable local professionals.",
      filters: null,
      providers: []
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedBookingProvider, setSelectedBookingProvider] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (messageToSend) => {
    const query = messageToSend || inputText;
    if (!query.trim() || loading) return;

    const userMsg = { sender: 'user', text: query.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: query.trim() });
      if (res.data.success) {
        const aiMsg = {
          sender: 'ai',
          text: res.data.ai_reply,
          filters: res.data.extracted_filters,
          providers: res.data.matched_providers || [],
          engine: res.data.engine
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'ai', text: "Sorry, I had trouble analyzing that. You can browse all verified providers using the 'Find Services' tab above!" }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: "Server connection error. Please ensure the backend server is running." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookFromAI = (prov) => {
    if (!user) {
      setIsOpen(false);
      navigate('/login');
      return;
    }
    if (user.role !== 'customer') {
      alert('Only registered Customer accounts can book service providers.');
      return;
    }
    setSelectedBookingProvider(prov);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center space-x-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-full shadow-xl hover:shadow-2xl transition duration-200 transform hover:-translate-y-0.5 cursor-pointer"
          >
            <div className="p-1 bg-white/20 rounded-full">
              <Sparkles className="h-4 w-4 text-white animate-pulse" />
            </div>
            <span className="text-xs font-bold tracking-wide">AI Assistant</span>
          </button>
        )}
      </div>

      {/* Floating AI Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-md h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
          
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl text-slate-950 font-bold">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center space-x-1.5">
                  <span>TrustNear AI Assistant</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
                    ONLINE
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Natural Language Provider Discovery</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/60 text-xs">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed shadow-2xs ${
                    m.sender === 'user'
                      ? 'bg-brand-600 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                  }`}
                >
                  <p>{m.text}</p>

                  {/* Extracted Intent Tags */}
                  {m.filters && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center flex-wrap gap-1.5">
                      {m.filters.category && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          Category: {m.filters.category}
                        </span>
                      )}
                      {m.filters.urgency === 'emergency' && (
                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-bold text-[10px] flex items-center">
                          <Zap className="h-3 w-3 mr-0.5" />
                          Emergency Priority
                        </span>
                      )}
                      {m.filters.location && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                          Area: {m.filters.location}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Inline Matched Providers */}
                  {m.providers && m.providers.length > 0 && (
                    <div className="mt-3 space-y-2 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Top Matched Professionals:
                      </span>
                      {m.providers.slice(0, 2).map((prov) => (
                        <div
                          key={prov.id}
                          className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">{prov.full_name}</span>
                            <span className="text-[10px] text-slate-500">
                              ₹{prov.hourly_rate}/hr • Trust: {prov.trust_score}/100
                            </span>
                          </div>
                          <button
                            onClick={() => handleBookFromAI(prov)}
                            className="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            Book Now
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-slate-500 bg-white p-3 rounded-2xl border border-slate-200 max-w-[80%]">
                <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                <span className="text-xs">AI Assistant is analyzing your issue...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="px-3 py-2 bg-slate-100/70 border-t border-slate-200 overflow-x-auto flex space-x-1.5 scrollbar-none">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-200 text-slate-700 text-[10px] font-medium border border-slate-200 whitespace-nowrap transition cursor-pointer shrink-0"
              >
                {prompt.length > 32 ? prompt.slice(0, 32) + '...' : prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe your home issue in plain English..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="p-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition shadow-xs disabled:opacity-40 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Booking Modal Trigger from AI Recommendation */}
      {selectedBookingProvider && (
        <BookingModal
          provider={selectedBookingProvider}
          onClose={() => setSelectedBookingProvider(null)}
        />
      )}
    </>
  );
};

export default AIAssistantWidget;
