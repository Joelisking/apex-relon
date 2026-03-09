'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { aiApi } from '@/lib/api/client';
import { ChatMessage, Lead, Client } from '@/lib/types';

interface AIAssistantProps {
  leads: Lead[];
  clients: Client[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  leads,
  clients,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Hello! I\'m your Apex CRM Assistant. Ask me anything about your leads, projects, or clients.',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Slim the context — pass summaries, not full objects
      const context = {
        leadsCount: leads.length,
        clientsCount: clients.length,
        leadsSummary: leads.slice(0, 15).map((l) => ({
          company: l.company,
          contactName: l.contactName,
          stage: l.stage,
          expectedValue: l.expectedValue,
          urgency: l.urgency,
          aiRiskLevel: l.aiRiskLevel,
        })),
        clientsSummary: clients.slice(0, 15).map((c) => ({
          name: c.name,
          status: c.status,
          segment: c.segment,
          industry: c.industry,
          lifetimeRevenue: c.lifetimeRevenue,
          healthScore: c.healthScore,
        })),
      };

      const response = await aiApi.chat(userMsg.text, context);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Sorry, I ran into an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 h-[500px] flex flex-col mb-4 border border-gray-200 animate-in fade-in">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 rounded-t-2xl flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Bot className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">
                CRM Assistant
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`flex max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                  <div
                    className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                      msg.sender === 'user'
                        ? 'bg-blue-100 ml-2'
                        : 'bg-slate-200 mr-2'
                    }`}>
                    {msg.sender === 'user' ? (
                      <User className="h-3 w-3 text-blue-700" />
                    ) : (
                      <Bot className="h-3 w-3 text-slate-700" />
                    )}
                  </div>
                  <div
                    className={`p-3 rounded-lg text-sm shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                    }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-tl-none text-xs text-gray-400 ml-8 shadow-sm">
                  Analyzing data...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-white border-t border-gray-100 rounded-b-2xl">
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about revenue, leads..."
                className="w-full bg-gray-100 text-gray-800 text-sm rounded-full pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="absolute right-1 top-1 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95">
          <MessageSquare className="h-7 w-7" />
        </button>
      )}
    </div>
  );
};

export default AIAssistant;
