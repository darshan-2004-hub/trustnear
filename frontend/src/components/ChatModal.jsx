import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, X } from 'lucide-react';

const ChatModal = ({ booking, onClose }) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newText, setNewText] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // REAL DATE & TIME FORMATTER
  const formatMessageTime = (msg) => {
    const rawTime = msg.sent_at || msg.created_at || msg.timestamp;
    if (!rawTime) return 'Just now';
    
    const d = new Date(rawTime);
    if (isNaN(d.getTime())) return 'Just now';

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  useEffect(() => {
    // 1. Fetch message history from REST API
    const loadChatHistory = async () => {
      try {
        const res = await api.get(`/bookings/${booking.id}/messages`);
        if (res.data?.success && Array.isArray(res.data.messages)) {
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    loadChatHistory();

    // 2. Connect to Flask-SocketIO
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_booking_room', {
        booking_id: booking.id,
        token: token,
      });
    });

    socket.on('new_chat_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, [booking.id, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newText.trim() || !socketRef.current) return;

    socketRef.current.emit('send_chat_message', {
      booking_id: booking.id,
      token: token,
      content: newText.trim(),
    });

    setNewText('');
  };

  const recipientName =
    user?.role === 'customer'
      ? booking.counterpart?.full_name || booking.provider_name || 'Service Provider'
      : booking.counterpart?.full_name || booking.customer_name || 'Customer';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl border border-[#e2e8f0] max-w-lg w-full h-[580px] flex flex-col relative shadow-xl overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-white border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {recipientName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-[#172033] text-sm">{recipientName}</h3>
                <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>{connected ? 'Live' : 'Connecting'}</span>
                </span>
              </div>
              <p className="text-[11px] text-[#475569]">{booking.service_title}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#475569] hover:text-[#172033] p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
          {messages.length === 0 ? (
            <div className="text-center py-16 text-xs text-[#475569]">
              <MessageSquare className="w-8 h-8 text-blue-600 mx-auto mb-2 opacity-60" />
              <p>No messages yet. Send a message to coordinate your booking!</p>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isMine = m.sender_id === user?.id;
              return (
                <div key={m.id || idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isMine
                        ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                        : 'bg-white border border-[#e2e8f0] text-[#172033] rounded-bl-xs shadow-xs'
                    }`}
                  >
                    {m.content || m.message_text}
                  </div>
                  <span className="text-[10px] text-[#475569] mt-1 px-1 font-medium">
                    {formatMessageTime(m)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#e2e8f0] flex items-center space-x-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-slate-50 border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-xs text-[#172033] placeholder-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
          />
          <button
            type="submit"
            disabled={!newText.trim()}
            className="p-2.5 btn-primary rounded-xl disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatModal;
