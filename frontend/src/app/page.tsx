"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ChevronRight,
  Zap,
  ShieldAlert,
  Wallet,
  Clock,
  ArrowUpRight,
  Flame,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import confetti from "canvas-confetti";
import { api } from "@/lib/api";
import { SpendingSummary, RecommendationsResponse, DailyChallenge, Transaction } from "@/types";
import { MoneyScoreRing } from "@/components/MoneyScoreRing";
import { CountUp } from "@/components/CountUp";
import { formatRupee, formatDate, CATEGORY_COLORS } from "@/lib/utils";

export default function HomePage() {
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const [sumData, recData, chalData, txnsData, reviewData] = await Promise.all([
        api.getSpendingSummary(),
        api.getRecommendations(),
        api.getDailyChallenge(),
        api.getTransactions({ limit: 6 }),
        api.getReviewQueue(),
      ]);
      setSummary(sumData);
      setRecommendations(recData);
      setChallenge(chalData);
      setRecentTxns(txnsData);
      setReviewCount(reviewData.length);
    } catch (err: any) {
      console.error("Failed to load dashboard data:", err);
      setPageError(err?.message || "Failed to load dashboard data. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleChallenge = async () => {
    try {
      const updated = await api.toggleDailyChallenge();
      setChallenge(updated);
      if (updated.completed) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#10B981", "#4F46E5", "#06B6D4"],
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 rounded-2xl bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 rounded-2xl bg-white/5" />
          <div className="h-64 rounded-2xl bg-white/5" />
          <div className="h-64 rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="glass-card p-8 text-center space-y-4 border border-rose-500/30">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Error Loading Dashboard</h3>
        <p className="text-xs text-gray-300 max-w-sm mx-auto">{pageError}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const score = summary?.money_score?.score ?? 82;
  const delta = summary?.money_score?.delta ?? null;
  const reason = summary?.money_score?.reason ?? "Financial score computed from savings rate, pacing, and subscriptions.";

  return (
    <div className="space-y-6">
      {/* Banner: Unreviewed Transactions Waiting */}
      {reviewCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-indigo-950/40 border border-indigo-500/30 shadow-lg flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                {reviewCount} Transactions in Swipe Review
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300">
                  AI Confidence &lt; 0.70
                </span>
              </h4>
              <p className="text-xs text-gray-300 mt-0.5">
                Swipe right to confirm, swipe left to correct. Your feedback teaches Rupee Radar!
              </p>
            </div>
          </div>
          <Link
            href="/review"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shrink-0"
          >
            Start Swipe
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      )}

      {/* Hero Section: Money Score & Safe-to-Spend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Money Score Ring Card (5 cols) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="lg:col-span-5 glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden"
        >
          <div className="absolute top-4 left-4 flex items-center gap-1.5 text-xs font-semibold text-gray-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Live Health Index
          </div>
          <MoneyScoreRing score={score} delta={delta} reason={reason} size={200} />
        </motion.div>

        {/* Safe-to-Spend & Burn Rate Card (7 cols) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="lg:col-span-7 glass-card p-6 flex flex-col justify-between relative overflow-hidden"
        >
          {/* Background Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-gray-400 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                Safe-to-Spend Today
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                {summary?.days_remaining ?? 15} days left in {summary?.active_month ?? "month"}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-3">
              <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                <CountUp value={summary?.safe_to_spend_today ?? 1420} isCurrency />
              </div>
              <span className="text-xs text-gray-400">/ day to hit 25% savings target</span>
            </div>

            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Calculated dynamically in code: Monthly income minus fixed commitments (Rent, EMI, Utilities) and month-to-date discretionary burn.
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-3 gap-4">
            <div>
              <span className="text-[11px] text-gray-400 font-medium block">Month Expense</span>
              <span className="text-base font-bold text-white block mt-0.5">
                <CountUp value={summary?.current_month_expense ?? 34500} isCurrency compact />
              </span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 font-medium block">Daily Burn Rate</span>
              <span className="text-base font-bold text-amber-400 block mt-0.5">
                <CountUp value={summary?.daily_burn_rate ?? 1250} isCurrency />
                <span className="text-[10px] text-gray-400">/day</span>
              </span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 font-medium block">Savings Rate (This month)</span>
              <span className="text-base font-bold text-emerald-400 block mt-0.5">
                <CountUp value={summary?.savings_rate ?? 38.5} suffix="%" />
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Daily Challenge Card */}
      {challenge && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 ${
            challenge.completed
              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
              : "bg-gradient-to-r from-amber-950/20 to-orange-950/20 border-amber-500/30 text-amber-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleChallenge}
              className={`p-2 rounded-xl transition-all ${
                challenge.completed
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                  : "bg-white/10 text-amber-300 hover:bg-white/20"
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Daily AI Micro-Challenge
                </span>
                <span className="text-xs text-emerald-400 font-semibold">
                  + Save ~{formatRupee(challenge.potential_saving)}
                </span>
              </div>
              <p className={`text-sm font-semibold mt-0.5 ${challenge.completed ? "line-through opacity-75" : "text-white"}`}>
                {challenge.title}
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleToggleChallenge}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              challenge.completed
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-amber-500 text-black shadow-md hover:bg-amber-400"
            }`}
          >
            {challenge.completed ? "Completed! 🎉" : "Mark Done"}
          </motion.button>
        </motion.div>
      )}

      {/* 3 Grounded AI Insight Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Grounded AI Financial Coach</h3>
          </div>
          <span className="text-xs text-gray-400">Strictly grounded in your computed numbers</span>
        </div>

        {(!recommendations?.insights || recommendations.insights.length === 0) ? (
          <div className="glass-card p-6 text-center text-gray-400 text-xs">
            <Sparkles className="w-6 h-6 text-emerald-400/60 mx-auto mb-2" />
            No coaching insights available yet. Log transactions to generate personalized savings insights.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.insights.slice(0, 3).map((insight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                whileHover={{ y: -3 }}
                className="glass-card p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        insight.difficulty === "easy"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : insight.difficulty === "medium"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {insight.difficulty} win
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      +{formatRupee(insight.monthly_saving_inr)}/mo
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{insight.title}</h4>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">{insight.detail}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-indigo-400 font-semibold">
                  <span>Annualized impact</span>
                  <span>+{formatRupee(insight.monthly_saving_inr * 12)}/yr</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions Feed */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Recent Transactions</h3>
            <p className="text-xs text-gray-400">Cleaned & auto-categorized with Pass 1 Rules & Pass 2 LLM</p>
          </div>
          <Link
            href="/insights"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Full Analytics <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTxns.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400">
            No transactions found. Click "+ Add" in the top bar to record your first transaction.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentTxns.map((txn) => {
              const isDebit = txn.type === "debit";
              const catColor = CATEGORY_COLORS[txn.category] || "#94A3B8";

              return (
                <div key={txn.id} className="py-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.02] px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: `${catColor}25`, border: `1px solid ${catColor}40` }}
                    >
                      <span style={{ color: catColor }}>
                        {txn.merchant_clean ? txn.merchant_clean[0].toUpperCase() : txn.description[0].toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                          {txn.merchant_clean || txn.description}
                        </span>
                        {txn.is_anomaly && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                            <ShieldAlert className="w-2.5 h-2.5" /> Anomaly
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span>{txn.category}</span>
                        <span>•</span>
                        <span>{formatDate(txn.date)}</span>
                        <span>•</span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded ${
                            txn.category_source === "ai"
                              ? "bg-indigo-500/20 text-indigo-300"
                              : txn.category_source === "user"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-gray-700/40 text-gray-300"
                          }`}
                        >
                          {txn.category_source}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-bold ${
                        isDebit ? "text-white" : "text-emerald-400"
                      }`}
                    >
                      {isDebit ? "-" : "+"}
                      {formatRupee(txn.amount)}
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {Math.round(txn.confidence * 100)}% conf
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

