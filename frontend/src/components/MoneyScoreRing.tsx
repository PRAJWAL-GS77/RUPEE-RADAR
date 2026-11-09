"use client";

import { motion } from "framer-motion";
import { CountUp } from "@/components/CountUp";
import { TrendingUp, ShieldCheck, Sparkles } from "lucide-react";

interface MoneyScoreRingProps {
  score: number;
  delta?: string | null;
  reason?: string;
  size?: number;
}

export function MoneyScoreRing({
  score,
  delta,
  reason = "Financial health score based on savings rate, pacing, and subscriptions.",
  size = 190,
}: MoneyScoreRingProps) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference;

  const isPositiveDelta = !delta || !delta.startsWith("-");

  return (
    <div className="flex flex-col items-center text-center p-2">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Glow behind the ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600/20 to-emerald-500/20 blur-xl pointer-events-none" />

        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-800/60 dark:text-gray-800/60"
            fill="transparent"
          />

          {/* Progress arc with Framer Motion */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#scoreGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
            fill="transparent"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: progressOffset }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Money Score
          </span>
          <div className="text-5xl font-extrabold tracking-tight text-white mt-0.5">
            <CountUp value={score} duration={1.2} />
          </div>
          <span className="text-[11px] text-gray-400">/ 100</span>
        </div>
      </div>

      {/* Delta Badge */}
      {delta && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{delta} points vs prior period</span>
        </motion.div>
      )}

      {/* Grounded explanation text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-2 text-xs text-gray-400 max-w-xs leading-relaxed"
      >
        {reason}
      </motion.p>
    </div>
  );
}

