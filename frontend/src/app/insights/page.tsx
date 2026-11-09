"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart as PieIcon,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Sparkles,
  ShieldAlert,
  CheckCircle,
  Filter,
  X,
  ExternalLink,
  Ban,
  Calendar,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import confetti from "canvas-confetti";
import { api } from "@/lib/api";
import { SpendingSummary, AnomalyItem, Transaction, RecurringPayment } from "@/types";
import { formatRupee, formatDate, CATEGORY_COLORS } from "@/lib/utils";

export default function InsightsPage() {
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [cancelledSubs, setCancelledSubs] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const [sumData, anomData, txnsData] = await Promise.all([
        api.getSpendingSummary(),
        api.getAnomalies(),
        api.getTransactions({ limit: 500 }),
      ]);
      setSummary(sumData);
      setAnomalies(anomData);
      setTransactions(txnsData);
    } catch (e: any) {
      console.error(e);
      setPageError(e?.message || "Failed to load insights data. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDismissAnomaly = async (id: number) => {
    try {
      await api.dismissAnomaly(id);
      setAnomalies((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelSub = (merchant: string, annualSaving: number) => {
    setCancelledSubs((prev) => ({ ...prev, [merchant]: true }));
    confetti({
      particleCount: 70,
      spread: 50,
      origin: { y: 0.7 },
      colors: ["#10B981", "#3B82F6"],
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 rounded-2xl bg-white/5" />
        <div className="h-80 rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="glass-card p-8 text-center space-y-4 border border-rose-500/30">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Error Loading Insights</h3>
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

  // Filter transactions based on clicked category slice
  const filteredTxns = selectedCategory
    ? transactions.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase())
    : transactions.slice(0, 8);

  const breakdownData = (summary?.category_breakdown || []).map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage,
    color: CATEGORY_COLORS[item.category] || "#94A3B8",
  }));

  const trendsData = (summary?.monthly_trends || []).map((t) => ({
    month: t.year_month,
    Income: t.credit,
    Expense: t.debit,
    Savings: t.savings,
  }));

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Intelligent Deep-Dive
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Spending & Anomaly Insights</h2>
        <p className="text-xs text-gray-400 mt-1">
          Code-computed monthly breakdown, scikit-learn anomaly flags, and recurring subscription audit.
        </p>
      </div>

      {/* Grid: Donut Chart & Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Donut (5 cols) */}
        <div className="lg:col-span-5 glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" />
                Category Breakdown
              </h3>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  Clear Filter <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mb-4">
              Tap any pie slice to filter transactions below.
            </p>

            <div className="h-[240px] w-full relative min-h-[240px]">
              {breakdownData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  No category expenses recorded this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      onClick={(entry) => setSelectedCategory(entry.name)}
                      cursor="pointer"
                    >
                      {breakdownData.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry.color}
                          stroke="rgba(0,0,0,0.4)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="glass-card bg-gray-900 border border-white/10 p-2.5 text-xs shadow-xl">
                              <span className="font-bold text-white block">{data.name}</span>
                              <span className="text-emerald-400 font-semibold">{formatRupee(data.value)}</span>
                              <span className="text-gray-400 ml-1">({data.percentage}%)</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Quick Legend Chips */}
          <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-2">
            {breakdownData.slice(0, 5).map((item) => (
              <button
                key={item.name}
                onClick={() => setSelectedCategory(selectedCategory === item.name ? null : item.name)}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-all ${
                  selectedCategory === item.name
                    ? "bg-white/20 text-white border border-white/30"
                    : "bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
                <span className="text-gray-400">{item.percentage}%</span>
              </button>
            ))}
          </div>
        </div>

        {/* 6-Month Area Trend Chart (7 cols) */}
        <div className="lg:col-span-7 glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                6-Month Income vs Expense Trend
              </h3>
              <span className="text-xs text-emerald-400 font-semibold">
                +{summary?.savings_rate ?? 0}% Savings Rate (This month)
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mb-4">
              Historical cashflow computed with pandas from SQLite transaction logs.
            </p>

            <div className="h-[240px] w-full min-h-[240px]">
              {trendsData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  No monthly trend data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={trendsData}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      tickFormatter={(val) => `₹${val / 1000}k`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="glass-card bg-gray-900 border border-white/10 p-3 text-xs shadow-xl space-y-1">
                              <span className="font-bold text-white block">{label}</span>
                              <div className="text-emerald-400">
                                Income: {formatRupee(payload[0]?.value as number)}
                              </div>
                              <div className="text-indigo-400">
                                Expense: {formatRupee(payload[1]?.value as number)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Income"
                      stroke="#10B981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#incomeGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Expense"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#expenseGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Expense
              </span>
            </div>
            <span>6 Months Aggregated</span>
          </div>
        </div>
      </div>

      {/* Filtered / Active Transaction List (Smooth transition on slice tap) */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              {selectedCategory ? `${selectedCategory} Transactions` : "Recent Filtered Activity"}
            </h3>
            {selectedCategory && (
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                {filteredTxns.length} records
              </span>
            )}
          </div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-gray-400 hover:text-white"
            >
              Reset Filter
            </button>
          )}
        </div>

        {filteredTxns.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No transactions match the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredTxns.slice(0, 8).map((txn) => (
              <div key={txn.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white block">{txn.merchant_clean || txn.description}</span>
                  <span className="text-gray-400">{formatDate(txn.date)} • {txn.category}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white block">{formatRupee(txn.amount)}</span>
                  <span className="text-[10px] text-gray-500">{txn.category_source}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Anomaly Detection Flags */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h3 className="text-base font-bold text-white">Flagged Anomalies & Duplicate Charges</h3>
          </div>
          <span className="text-xs text-gray-400">IsolationForest (scikit-learn) + 48h Duplicate Rules</span>
        </div>

        {anomalies.length === 0 ? (
          <div className="glass-card p-8 text-center text-xs text-gray-400 border border-white/5">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            No anomalies detected. All discretionary spending aligns with historical patterns.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anomalies.map((anom) => (
              <motion.div
                key={anom.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-5 border border-rose-500/20 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">
                        {anom.merchant_clean || anom.description}
                      </span>
                      <span className="text-sm font-extrabold text-rose-400">
                        {formatRupee(anom.amount)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDate(anom.date)} • {anom.category}
                    </div>
                    <p className="text-xs text-rose-200/80 bg-rose-950/30 p-2.5 rounded-xl border border-rose-500/20 mt-3 leading-relaxed">
                      💡 <strong>AI Explanation:</strong> {anom.anomaly_reason}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                  <button
                    onClick={() => handleDismissAnomaly(anom.id)}
                    className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                  >
                    Dismiss / Verified OK
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Subscription Audit & 1-Tap Cancellation */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              Subscription Audit
            </h3>
            <p className="text-xs text-gray-400">
              Auto-detected recurring payments across multiple billing cycles.
            </p>
          </div>
        </div>

        {(!summary?.recurring_payments || summary.recurring_payments.length === 0) ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No recurring subscriptions detected yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.recurring_payments.map((sub, idx) => {
              const isCancelled = cancelledSubs[sub.merchant];
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    sub.is_unused_alert && !isCancelled
                      ? "bg-rose-950/20 border-rose-500/30"
                      : isCancelled
                      ? "bg-emerald-950/20 border-emerald-500/30 opacity-75"
                      : "bg-white/5 border-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{sub.merchant}</h4>
                      <span className="text-xs text-gray-400">{sub.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-white">
                        {formatRupee(sub.avg_amount)}/mo
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        {formatRupee(sub.annual_cost)}/yr
                      </span>
                    </div>
                  </div>

                  {sub.is_unused_alert && !isCancelled && (
                    <div className="mt-3 p-2 rounded-lg bg-rose-500/10 text-rose-300 text-[11px] font-medium border border-rose-500/20">
                      ⚠️ Appears unused (0 activity in 90 days)
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      Active in {sub.months_active} months
                    </span>

                    {isCancelled ? (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Cancelled!
                      </span>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleCancelSub(sub.merchant, sub.annual_cost)}
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-rose-500/20 text-gray-300 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Ban className="w-3 h-3" />
                        Mark Cancelled
                      </motion.button>
                    )}
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
