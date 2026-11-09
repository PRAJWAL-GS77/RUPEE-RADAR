"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Sparkles,
  Plus,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Trash2,
  Scissors,
  Loader2,
  DollarSign,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import confetti from "canvas-confetti";
import { api } from "@/lib/api";
import { Goal } from "@/types";
import { formatRupee, formatDate } from "@/lib/utils";
import { CountUp } from "@/components/CountUp";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Goal State
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState<number | "">("");
  const [currentAmount, setCurrentAmount] = useState<number | "">("");
  const [targetDate, setTargetDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Tomorrow date string for min attribute
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split("T")[0];

  const loadGoals = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const data = await api.getGoals();
      setGoals(data);
    } catch (e: any) {
      console.error(e);
      setPageError(e?.message || "Failed to load goals. Ensure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleAddGoal = async () => {
    if (!name || !targetAmount || !targetDate) return;
    setIsSaving(true);
    setFormError(null);
    try {
      await api.createGoal({
        name,
        target_amount: Number(targetAmount),
        current_amount: Number(currentAmount || 0),
        target_date: targetDate,
      });
      setIsAddOpen(false);
      setName("");
      setTargetAmount("");
      setCurrentAmount("");
      setTargetDate("");
      loadGoals();
    } catch (e: any) {
      console.error(e);
      setFormError(e?.message || "Failed to create goal. Please check inputs and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFunds = async (goal: Goal, amountToAdd: number) => {
    try {
      const updated = await api.addFundsToGoal(goal.id, amountToAdd);
      const newPct = (updated.current_amount / updated.target_amount) * 100;

      // Milestone confetti at 25%, 50%, 75%, 100%
      if (newPct >= 25) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#10B981", "#6366F1", "#F59E0B"],
        });
      }
      loadGoals();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGoal = async (id: number) => {
    try {
      await api.deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 rounded-2xl bg-white/5" />
        <div className="h-48 rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="glass-card p-8 text-center space-y-4 border border-rose-500/30">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Error Loading Goals</h3>
        <p className="text-xs text-gray-300 max-w-sm mx-auto">{pageError}</p>
        <button
          onClick={loadGoals}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title & Add Goal Button */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-2">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            Liquid-Fill Goal Planner
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Financial Goals & AI Budget Trims</h2>
          <p className="text-xs text-gray-400 mt-1">
            Set targeted savings milestones with AI category-trim recommendations summing to target.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setFormError(null);
            setIsAddOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </motion.button>
      </div>

      {/* Goals Empty State */}
      {goals.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-4 border border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
            <Target className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Savings Goals Yet</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Set a target for your next milestone—like a laptop fund or emergency buffer. Rupee Radar will compute required monthly savings and optimal category trims.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setFormError(null);
              setIsAddOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            Create Your First Goal
          </motion.button>
        </div>
      ) : (
        /* Goals List */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
            const remaining = Math.max(0, goal.target_amount - goal.current_amount);
            let trims: any[] = [];
            try {
              if (goal.category_trims) {
                trims = JSON.parse(goal.category_trims);
              }
            } catch (e) {
              trims = [];
            }

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 flex flex-col justify-between relative overflow-hidden"
              >
                {/* Background Liquid Glow */}
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none transition-all duration-700"
                  style={{ height: `${progress}%` }}
                />

                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">{goal.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Target Date: {formatDate(goal.target_date)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 text-gray-500 hover:text-rose-400 transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress Stats */}
                  <div className="mt-5 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-white">
                        <CountUp value={goal.current_amount} isCurrency />
                      </span>
                      <span className="text-xs text-gray-400 ml-1.5">
                        of {formatRupee(goal.target_amount)}
                      </span>
                    </div>
                    <span className="text-base font-extrabold text-emerald-400">
                      {Math.round(progress)}%
                    </span>
                  </div>

                  {/* Liquid Fill Progress Bar */}
                  <div className="mt-2 w-full h-3 rounded-full bg-white/10 overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: "easeOut", duration: 1.2 }}
                      className="h-full bg-gradient-to-r from-indigo-500 via-teal-400 to-emerald-400 rounded-full"
                    />
                  </div>

                  {/* Milestone Indicators (25, 50, 75, 100) */}
                  <div className="mt-1 flex justify-between text-[10px] text-gray-500 font-medium px-1">
                    <span className={progress >= 25 ? "text-emerald-400 font-bold" : ""}>25%</span>
                    <span className={progress >= 50 ? "text-emerald-400 font-bold" : ""}>50%</span>
                    <span className={progress >= 75 ? "text-emerald-400 font-bold" : ""}>75%</span>
                    <span className={progress >= 100 ? "text-emerald-400 font-bold" : ""}>Goal!</span>
                  </div>

                  {/* AI Trim Suggestions Box */}
                  {trims.length > 0 && (
                    <div className="mt-5 p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 mb-2">
                        <Scissors className="w-3.5 h-3.5 text-indigo-400" />
                        AI Recommended Category Trims
                      </span>
                      <div className="space-y-1.5">
                        {trims.map((trim, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-gray-300">
                              • Trim <strong>{trim.category}</strong>
                            </span>
                            <span className="font-bold text-emerald-400">
                              -{formatRupee(trim.monthly_cut)}/mo
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Add Funds Action */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {remaining > 0 ? `${formatRupee(remaining)} remaining` : "Goal Achieved! 🎉"}
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddFunds(goal, 1000)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                    >
                      + ₹1,000
                    </button>
                    <button
                      onClick={() => handleAddFunds(goal, 5000)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
                    >
                      + ₹5,000
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* New Goal Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="relative w-full max-w-md glass-card bg-gray-900 border border-white/10 p-6 shadow-2xl z-10"
            >
              <h3 className="text-lg font-bold text-white">Create Savings Goal</h3>
              <p className="text-xs text-gray-400 mt-1">
                AI will automatically calculate required monthly savings and suggest optimal category budget trims.
              </p>

              {formError && (
                <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium">Goal Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. MacBook Pro M4 Fund"
                    className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 font-medium">Target Amount (₹)</label>
                    <input
                      type="number"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value ? parseFloat(e.target.value) : "")}
                      placeholder="e.g. 120000"
                      className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium">Initial Amount (₹)</label>
                    <input
                      type="number"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value ? parseFloat(e.target.value) : "")}
                      placeholder="e.g. 15000"
                      className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-medium">Target Completion Date</label>
                  <input
                    type="date"
                    min={minDateStr}
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAddGoal}
                  disabled={isSaving || !name || !targetAmount || !targetDate}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-600 text-white text-sm font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isSaving ? "Calculating Trims..." : "Generate AI Plan"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
