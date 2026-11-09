"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Check,
  X,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Layers,
  Inbox,
  ShieldCheck,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { api } from "@/lib/api";
import { Transaction } from "@/types";
import { formatRupee, formatDate, CATEGORIES_LIST, CATEGORY_COLORS } from "@/lib/utils";

export default function SwipeReviewPage() {
  const [queue, setQueue] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [reviewCountInitial, setReviewCountInitial] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const loadQueue = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const items = await api.getReviewQueue();
      setQueue(items);
      setReviewCountInitial(items.length);
      setCurrentIndex(0);
    } catch (e: any) {
      console.error(e);
      setPageError(e?.message || "Failed to load review queue. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await api.resetDemo();
      await loadQueue();
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  const handleConfirmCurrent = async () => {
    if (currentIndex >= queue.length) return;
    const txn = queue[currentIndex];
    try {
      await api.reviewTransaction(txn.id, {
        category: txn.category,
        merchant_clean: txn.merchant_clean || txn.description,
        confirmed: true,
      });
      advanceCard();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCorrectCurrent = async (chosenCat: string) => {
    if (currentIndex >= queue.length) return;
    const txn = queue[currentIndex];
    try {
      await api.reviewTransaction(txn.id, {
        category: chosenCat,
        merchant_clean: txn.merchant_clean || txn.description,
        confirmed: false,
      });
      setIsCategoryPickerOpen(false);
      advanceCard();
    } catch (e) {
      console.error(e);
    }
  };

  const advanceCard = () => {
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);

    if (nextIdx >= queue.length) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#10B981", "#6366F1", "#EC4899", "#F59E0B"],
      });
      api.checkInStreak().catch(console.error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading your AI Swipe Review queue...</p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="max-w-md mx-auto glass-card p-8 text-center space-y-4 border border-rose-500/30">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Error Loading Review Queue</h3>
        <p className="text-xs text-gray-300">{pageError}</p>
        <button
          onClick={loadQueue}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const activeTxn = queue[currentIndex];
  const isInboxZero = currentIndex >= queue.length || queue.length === 0;
  const progressPct = reviewCountInitial > 0 ? (currentIndex / reviewCountInitial) * 100 : 100;

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Header & Progress */}
      <div className="text-center relative">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-2">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          Tinder-Style AI Review Queue
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Swipe Review</h2>
        <p className="text-xs text-gray-400 mt-1">
          Swipe right to confirm, swipe left to pick another category.
        </p>

        {/* Reset Demo Data Button */}
        <div className="mt-3 flex justify-center">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleResetDemo}
            disabled={isResetting}
            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-gray-300 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Reset demo data with unreviewed transactions"
          >
            {isResetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 text-indigo-400" />}
            Reset Demo Data
          </motion.button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ ease: "easeOut", duration: 0.4 }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-400 tabular-nums">
            {Math.min(currentIndex, queue.length)} / {queue.length}
          </span>
        </div>
      </div>

      {/* Card Deck Area */}
      <div className="relative h-[380px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!isInboxZero && activeTxn ? (
            <SwipeCard
              key={activeTxn.id}
              transaction={activeTxn}
              onSwipeRight={handleConfirmCurrent}
              onSwipeLeft={() => setIsCategoryPickerOpen(true)}
            />
          ) : (
            <motion.div
              key="inbox-zero"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full glass-card p-8 text-center flex flex-col items-center justify-center space-y-4 border border-emerald-500/30"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">Inbox Zero! 🎉</h3>
              <p className="text-xs text-gray-300 max-w-xs leading-relaxed">
                All low-confidence transactions have been verified. Your few-shot corrections have been stored to train future AI prompts.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={loadQueue}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Refresh
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleResetDemo}
                  disabled={isResetting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Reset Demo
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Action Controls (when active card exists) */}
      {!isInboxZero && activeTxn && (
        <div className="flex items-center justify-center gap-6 pt-2">
          {/* Reject / Correct (Left) */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsCategoryPickerOpen(true)}
            className="w-14 h-14 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-lg transition-all"
            title="Swipe Left to Correct Category"
          >
            <X className="w-6 h-6" />
          </motion.button>

          {/* Quick Category Sheet Trigger */}
          <button
            onClick={() => setIsCategoryPickerOpen(true)}
            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-medium flex items-center gap-1.5"
          >
            Change Category
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Confirm (Right) */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleConfirmCurrent}
            className="w-14 h-14 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg transition-all"
            title="Swipe Right to Confirm Category"
          >
            <Check className="w-6 h-6" />
          </motion.button>
        </div>
      )}

      {/* Category Picker Drawer / Bottom Sheet */}
      <AnimatePresence>
        {isCategoryPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryPickerOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="relative w-full max-w-md glass-card bg-gray-900 border border-white/10 p-6 rounded-t-3xl sm:rounded-2xl z-10 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <h4 className="text-sm font-bold text-white">Select Correct Category</h4>
                <button
                  onClick={() => setIsCategoryPickerOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES_LIST.map((cat) => {
                  const color = CATEGORY_COLORS[cat] || "#94A3B8";
                  return (
                    <motion.button
                      key={cat}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleCorrectCurrent(cat)}
                      className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left flex items-center gap-2.5 transition-colors"
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-semibold text-white truncate">{cat}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Draggable Swipe Card Component with Framer Motion Spring Gestures
function SwipeCard({
  transaction,
  onSwipeRight,
  onSwipeLeft,
}: {
  transaction: Transaction;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const opacityRight = useTransform(x, [20, 100], [0, 1]);
  const opacityLeft = useTransform(x, [-100, -20], [1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipeRight();
    } else if (info.offset.x < -100) {
      onSwipeLeft();
    }
  };

  const catColor = CATEGORY_COLORS[transaction.category] || "#94A3B8";

  return (
    <motion.div
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="absolute w-full max-w-sm glass-card bg-gray-900/90 border border-white/10 p-6 shadow-2xl cursor-grab active:cursor-grabbing select-none"
    >
      {/* Swipe Badges (Visible on Drag) */}
      <motion.div
        style={{ opacity: opacityRight }}
        className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500 font-extrabold text-xs uppercase tracking-wider"
      >
        Confirm ✓
      </motion.div>

      <motion.div
        style={{ opacity: opacityLeft }}
        className="absolute top-4 left-4 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500 font-extrabold text-xs uppercase tracking-wider"
      >
        Change ✗
      </motion.div>

      {/* Card Content */}
      <div className="flex flex-col items-center text-center mt-2">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-2xl text-white shadow-lg mb-4"
          style={{ backgroundColor: `${catColor}30`, border: `1px solid ${catColor}50` }}
        >
          <span style={{ color: catColor }}>
            {transaction.merchant_clean ? transaction.merchant_clean[0].toUpperCase() : transaction.description[0].toUpperCase()}
          </span>
        </div>

        <h3 className="text-lg font-black text-white tracking-tight">
          {transaction.merchant_clean || transaction.description}
        </h3>
        <p className="text-xs text-gray-400 font-mono mt-1 max-w-[280px] truncate">
          {transaction.description}
        </p>

        <div className="text-3xl font-black text-white mt-3">
          {formatRupee(transaction.amount)}
        </div>

        <div className="text-xs text-gray-400 mt-1">
          {formatDate(transaction.date)}
        </div>

        <div className="mt-5 w-full p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-[11px] text-gray-400 font-medium block">
            AI Proposed Category
          </span>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span
              className="text-sm font-bold"
              style={{ color: catColor }}
            >
              {transaction.category}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
              {Math.round(transaction.confidence * 100)}% conf
            </span>
          </div>
        </div>

        <p className="text-[11px] text-gray-500 mt-4">
          👉 Swipe right to accept • 👈 Swipe left to pick another
        </p>
      </div>
    </motion.div>
  );
}
