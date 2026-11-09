"use client";

import { motion } from "framer-motion";
import { Flame, Shield } from "lucide-react";

interface StreakBadgeProps {
  streak: number;
  freezes: number;
  onClick?: () => void;
}

export function StreakBadge({ streak, freezes, onClick }: StreakBadgeProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold shadow-sm backdrop-blur-md"
      title={`${streak} Day Review Streak. ${freezes} Streak Freeze available.`}
    >
      <motion.div
        animate={{ scale: [1, 1.25, 1], rotate: [0, -5, 5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
      </motion.div>
      <span>{streak} Day Streak</span>
      {freezes > 0 && (
        <span className="flex items-center gap-0.5 text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-full border border-sky-500/20">
          <Shield className="w-2.5 h-2.5" />
          {freezes}
        </span>
      )}
    </motion.button>
  );
}

