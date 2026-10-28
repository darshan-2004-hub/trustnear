import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, X, ShieldCheck } from 'lucide-react';

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

  useEffect(() => {
    // 1. Fetch message history
    const loadChatHistory = async () => {
      try {
        const res = await api.get(`/bookings/${booking.id}/messages`);
        if (res.data.success) {
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
      ? booking.provider_name || 'Service Provider'
      : booking.customer_name || 'Customer';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="theme-card max-w-lg w-full h-[580px] flex flex-col relative shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#1c2036] border-b border-[#363d66] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6d5dfc] to-[#d946ef] p-0.5">
              <div className="w-full h-full bg-[#1c2036] rounded-[10px] flex items-center justify-center font-bold text-white text-sm">
                {recipientName.charAt(0)}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-sm">{recipientName}</h3>
                <span className="flex items-center space-x-1 text-[10px] font-bold text-[#2dd4bf]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf] animate-ping" />
                  <span>{connected ? 'Live' : 'Connecting'}</span>
                </span>
              </div>
              <p className="text-[11px] text-[#a9b0d0]">{booking.service_title}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#a9b0d0] hover:text-white p-1 rounded-lg hover:bg-[#262b47]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#1c2036]/60">
          {messages.length === 0 ? (
            <div className="text-center py-16 text-xs text-[#a9b0d0]">
              <MessageSquare className="w-8 h-8 text-[#6d5dfc] mx-auto mb-2 opacity-60" />
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
                        ? 'bg-gradient-to-r from-[#6d5dfc] to-[#d946ef] text-white rounded-br-xs shadow-md'
                        : 'bg-[#262b47] border border-[#363d66] text-white rounded-bl-xs'
                    }`}
                  >
                    {m.message_text || m.content}
                  </div>
                  <span className="text-[10px] text-[#a9b0d0] mt-1 px-1">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-[#262b47] border-t border-[#363d66] flex items-center space-x-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-[#1c2036] border border-[#363d66] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#6d5dfc]"
          />
          <button
            type="submit"
            disabled={!newText.trim()}
            className="p-2.5 btn-primary rounded-xl disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatModal;