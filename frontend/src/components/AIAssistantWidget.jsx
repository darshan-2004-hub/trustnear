import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Sparkles, MessageSquare, Send, X, Bot, User, ArrowRight, ShieldCheck } from 'lucide-react';

const SUGGESTIONS = [
  'Need an electrician to fix sudden circuit trip',
  'Leaking pipe under kitchen sink Kadri',
  'Deep villa cleaning service required',
];

const AIAssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I'm TrustNear's AI Assistant. Describe your home repair in everyday words, and I'll match you with verified local experts.",
      matches: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg = { sender: 'user', text: query.trim(), matches: [] };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: query.trim() });
      if (res.data?.success) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: res.data.ai_reply,
            matches: res.data.matched_providers || [],
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'I could not process that request. Try specifying a trade like Plumbing or Electrician.',
            matches: [],
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Matching you with verified pros in Mangaluru...',
          matches: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 btn-primary shadow-2xl flex items-center space-x-2 text-xs font-bold"
      >
        <Sparkles className="w-4 h-4 text-[#2dd4bf] animate-spin" />
        <span>AI Assistant</span>
      </button>

      {/* Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[540px] theme-card flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          
          {/* Header */}
          <div className="p-4 bg-[#1c2036] border-b border-[#363d66] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6d5dfc] to-[#d946ef] p-0.5">
                <div className="w-full h-full bg-[#1c2036] rounded-[10px] flex items-center justify-center text-[#2dd4bf]">
                  <Bot className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-white text-xs">TrustNear AI Assistant</h3>
                <span className="text-[10px] text-[#2dd4bf] font-bold">ONLINE</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#a9b0d0] hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#1c2036]/60 text-xs">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-2xl leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-[#6d5dfc] to-[#d946ef] text-white rounded-br-xs'
                      : 'bg-[#262b47] border border-[#363d66] text-white rounded-bl-xs'
                  }`}
                >
                  <p>{m.text}</p>

                  {/* Matched Providers Cards inside AI reply */}
                  {m.matches && m.matches.length > 0 && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-[#363d66]">
                      <p className="text-[10px] font-bold uppercase text-[#2dd4bf]">Top Matches Found:</p>
                      {m.matches.slice(0, 2).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setIsOpen(false);
                            navigate(`/providers?q=${encodeURIComponent(p.full_name)}`);
                          }}
                          className="p-2 rounded-xl bg-[#1c2036] border border-[#363d66] hover:border-[#6d5dfc] cursor-pointer transition flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-white text-[11px]">{p.full_name}</p>
                            <p className="text-[10px] text-[#a9b0d0]">{p.service_category} • ₹{p.hourly_rate}/hr</p>
                          </div>
                          <span className="text-[10px] font-bold text-[#2dd4bf]">
                            {p.trust_score ? `${Number(p.trust_score).toFixed(0)} Trust` : 'Book'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="p-2 bg-[#1c2036] border-t border-[#363d66] flex space-x-1.5 overflow-x-auto text-[10px]">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="px-2.5 py-1 rounded-lg bg-[#262b47] border border-[#363d66] hover:border-[#6d5dfc] text-[#a9b0d0] hover:text-white whitespace-nowrap transition cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-[#262b47] border-t border-[#363d66] flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything (e.g. AC cooling problem)..."
              className="flex-1 bg-[#1c2036] border border-[#363d66] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#6d5dfc]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 btn-primary rounded-xl disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}
    </>
  );
};

export default AIAssistantWidget;