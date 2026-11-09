"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Check, ArrowRight, Loader2, PlusCircle } from "lucide-react";
import { api } from "@/lib/api";
import { CATEGORIES_LIST, formatRupee } from "@/lib/utils";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
}: AddTransactionModalProps) {
  const [nlInput, setNlInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Parsed structured fields
  const [amount, setAmount] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Food Delivery");
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [txnType, setTxnType] = useState<"debit" | "credit">("debit");
  const [merchantClean, setMerchantClean] = useState("");
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);

  const handleParseNL = async () => {
    if (!nlInput.trim()) return;
    setIsParsing(true);
    try {
      const parsed = await api.parseNaturalLanguage(nlInput);
      if (parsed) {
        setAmount(parsed.amount || "");
        setDescription(parsed.description || nlInput);
        setCategory(parsed.category || "Other");
        setDateStr(parsed.date || new Date().toISOString().split("T")[0]);
        setTxnType(parsed.type || "debit");
        setMerchantClean(parsed.merchant_clean || "");
        setAiConfidence(parsed.confidence || 0.90);
      }
    } catch (e) {
      console.error("NL parse error:", e);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!amount || !description) return;
    setIsSaving(true);
    try {
      await api.createTransaction({
        date: dateStr,
        description,
        amount: Number(amount),
        type: txnType,
        category,
        merchant_clean: merchantClean || description,
        category_source: aiConfidence ? "ai" : "user",
        confidence: aiConfidence || 1.0,
        is_reviewed: true,
      });
      onSuccess();
      onClose();
      // Reset
      setNlInput("");
      setAmount("");
      setDescription("");
      setAiConfidence(null);
    } catch (e) {
      console.error("Failed to save transaction:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative w-full max-w-lg glass-card bg-gray-900/95 border border-white/10 p-6 shadow-2xl z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Add Transaction</h3>
                  <p className="text-xs text-gray-400">Natural language AI parsing or manual entry</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Natural Language Box */}
            <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-indigo-950/40 to-emerald-950/30 border border-indigo-500/20">
              <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Natural Language Quick Parse
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nlInput}
                  onChange={(e) => setNlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleParseNL()}
                  placeholder="e.g. spent 450 on dinner with friends yesterday"
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleParseNL}
                  disabled={isParsing || !nlInput.trim()}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Parse
                </motion.button>
              </div>
            </div>

            {aiConfidence !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                AI parsed with {Math.round(aiConfidence * 100)}% confidence
              </motion.div>
            )}

            {/* Structured Fields */}
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium">Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? parseFloat(e.target.value) : "")}
                    placeholder="Enter amount (e.g. 250)"
                    className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium">Type</label>
                  <select
                    value={txnType}
                    onChange={(e) => setTxnType(e.target.value as "debit" | "credit")}
                    className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="debit">Debit (Expense)</option>
                    <option value="credit">Credit (Income)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Merchant / Transaction description"
                  className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                  >
                    {CATEGORIES_LIST.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium">Date</label>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={isSaving || typeof amount !== "number" || amount <= 0 || !description.trim()}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-600 text-white text-sm font-semibold flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Transaction
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

