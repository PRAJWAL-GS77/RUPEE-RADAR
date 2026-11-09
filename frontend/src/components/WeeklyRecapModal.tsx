"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Award, Sparkles, TrendingDown, Share2, Check } from "lucide-react";
import { formatRupee } from "@/lib/utils";
import { useState } from "react";

interface WeeklyRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  savingsRate: number;
  topCategory: string;
  topCategoryAmount: number;
  streak: number;
  badges?: string[];
}

export function WeeklyRecapModal({
  isOpen,
  onClose,
  savingsRate,
  topCategory,
  topCategoryAmount,
  streak,
  badges = ["Active Reviewer", "Rupee Radar Pioneer"],
}: WeeklyRecapModalProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard?.writeText(
      `💸 Rupee Radar Weekly Recap: Saved ${savingsRate}% of my income this week on a ${streak}-day financial review streak! 🚀`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-sm glass-card bg-gradient-to-b from-gray-900 to-gray-950 border border-indigo-500/30 p-6 shadow-2xl z-10 text-center overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Weekly Financial Recap
            </div>

            <h3 className="text-xl font-extrabold text-white">Your Money in Review</h3>
            <p className="text-xs text-gray-400 mt-1">Disciplined, grounded, and building wealth.</p>

            {/* Big Stat */}
            <div className="my-6 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-4xl font-extrabold text-emerald-400">
                {savingsRate}%
              </div>
              <div className="text-xs text-gray-300 font-medium mt-1">
                Savings Rate (This month)
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[11px] text-gray-400 block">Top Category</span>
                <span className="text-sm font-bold text-white block mt-0.5 truncate">{topCategory}</span>
                <span className="text-xs text-rose-400">{formatRupee(topCategoryAmount)}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[11px] text-gray-400 block">Active Streak</span>
                <span className="text-sm font-bold text-amber-400 block mt-0.5">{streak} Days 🔥</span>
                <span className="text-[11px] text-gray-400">Habit Formed</span>
              </div>
            </div>

            {/* Badges Earned */}
            <div className="mt-4 pt-4 border-t border-white/10 text-left">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                Badges Earned
              </span>
              <div className="flex flex-wrap gap-2">
                {badges.map((b, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border ${
                      i % 2 === 0
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    }`}
                  >
                    <Award className="w-3 h-3 text-emerald-400" /> {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Share Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleShare}
              className="mt-6 w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? "Copied to Clipboard!" : "Share Recap Card"}
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

