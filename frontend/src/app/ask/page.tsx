"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  Database,
  Code2,
  ChevronDown,
  ChevronUp,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { ChatResponse } from "@/types";
import { formatRupee } from "@/lib/utils";

interface MessageItem {
  id: string;
  sender: "user" | "ai";
  text: string;
  querySpec?: any;
  result?: any;
  timestamp: string;
}

const SUGGESTED_CHIPS = [
  "How much did I spend on food last month?",
  "What was my highest shopping expense?",
  "How much did I spend on subscriptions?",
  "How many Swiggy orders this period?",
  "What was my average spend on Groceries?",
];

export default function AskMoneyPage() {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "initial",
      sender: "ai",
      text: "Namaste! I'm your Rupee Radar AI financial copilot. Ask me anything about your spending, food delivery habits, subscriptions, or savings rate. Every calculation is performed deterministically by code—never hallucinated math.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [expandedSpecId, setExpandedSpecId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (queryText?: string) => {
    const text = queryText || input;
    if (!text.trim() || isTyping) return;

    const userMsg: MessageItem = {
      id: Date.now().toString(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setIsTyping(true);

    try {
      const resp = await api.sendChatMessage(text);
      const aiMsg: MessageItem = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: resp.answer,
        querySpec: resp.query_spec,
        result: resp.result,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "Sorry, I had trouble querying the database. Please try another question.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Explainable Financial Copilot
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Ask Your Money</h2>
        <p className="text-xs text-gray-400 mt-1">
          Natural language is translated to a structured database query spec executed in Python/SQL.
        </p>
      </div>

      {/* Suggested Question Chips */}
      <div className="flex flex-wrap gap-2 pt-1">
        {SUGGESTED_CHIPS.map((chip, i) => (
          <button
            key={i}
            onClick={() => handleSend(chip)}
            className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-medium transition-all"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Chat Messages Box */}
      <div className="glass-card p-4 sm:p-6 min-h-[480px] max-h-[580px] overflow-y-auto space-y-4 flex flex-col">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const isExpanded = expandedSpecId === msg.id;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 p-0.5 flex items-center justify-center shrink-0">
                  <div className="w-full h-full bg-gray-900 rounded-[10px] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              )}

              <div className={`max-w-[85%] space-y-1.5 ${isUser ? "items-end" : "items-start"}`}>
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium rounded-tr-sm"
                      : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm"
                  }`}
                >
                  <div className="space-y-1">
                    {msg.text.split("\n").map((line, lIdx) => {
                      const parts = line.split(/(\*\*.*?\*\*)/g);
                      const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-");
                      return (
                        <p key={lIdx} className={isBullet ? "pl-3 text-emerald-300/90 font-medium" : ""}>
                          {parts.map((part, pIdx) => {
                            if (part.startsWith("**") && part.endsWith("**")) {
                              return (
                                <strong key={pIdx} className="font-bold text-white tracking-wide">
                                  {part.slice(2, -2)}
                                </strong>
                              );
                            }
                            return part;
                          })}
                        </p>
                      );
                    })}
                  </div>
                </div>

                {/* AI Query Spec & Explainability Pill */}
                {msg.querySpec && (
                  <div className="pt-1">
                    <button
                      onClick={() => setExpandedSpecId(isExpanded ? null : msg.id)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-colors"
                    >
                      <Database className="w-3 h-3 text-emerald-400" />
                      <span>AI Query Spec (Explainability)</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono space-y-2 overflow-x-auto"
                        >
                          <div>
                            <span className="text-gray-400 block">// Structured Query Translated from NL:</span>
                            <pre className="text-emerald-400 mt-0.5">
                              {JSON.stringify(msg.querySpec, null, 2)}
                            </pre>
                          </div>
                          <div className="pt-2 border-t border-white/10">
                            <span className="text-gray-400 block">
                              // Executed Result Summary (Count: {msg.result?.count ?? 0}):
                            </span>
                            <pre className="text-indigo-300 mt-0.5">
                              {JSON.stringify(
                                {
                                  count: msg.result?.count ?? 0,
                                  value: msg.result?.value ?? 0,
                                  ...(msg.result?.period ? { period: msg.result.period } : {}),
                                  ...(msg.result?.income !== undefined ? { income: msg.result.income } : {}),
                                  ...(msg.result?.expense !== undefined ? { expense: msg.result.expense } : {}),
                                  ...(msg.result?.top_item ? { top_item: msg.result.top_item } : {}),
                                  items: (msg.result?.items || []).slice(0, 5),
                                },
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <span className="text-[10px] text-gray-500 block px-1">
                  {msg.timestamp}
                </span>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 text-white">
                  <User className="w-4 h-4 text-indigo-300" />
                </div>
              )}
            </motion.div>
          );
        })}

        {isTyping && (
          <div className="flex gap-3 items-center text-xs text-gray-400">
            <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
              <Bot className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Translating question to query spec & computing DB metrics...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="relative flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a question about your spending (e.g. How much did I spend on food?)..."
          className="flex-1 bg-gray-900/90 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 shadow-xl"
        />
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSend()}
          disabled={isTyping || !input.trim()}
          className="w-12 h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-600 text-white flex items-center justify-center shadow-lg disabled:opacity-40"
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}

