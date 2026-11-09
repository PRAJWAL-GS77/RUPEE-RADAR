"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Compass,
  Layers,
  PieChart,
  Target,
  MessageSquare,
  Plus,
  Sun,
  Moon,
  Calendar,
  Sparkles,
} from "lucide-react";
import { StreakBadge } from "./StreakBadge";
import { AddTransactionModal } from "./AddTransactionModal";
import { WeeklyRecapModal } from "./WeeklyRecapModal";
import { api } from "@/lib/api";
import { SpendingSummary, UserStreak } from "@/types";

interface NavbarProps {
  streak?: number;
  freezes?: number;
  savingsRate?: number;
  onRefreshData?: () => void;
}

const NAV_ITEMS = [
  { href: "/", label: "Today", icon: Compass },
  { href: "/review", label: "Swipe Review", icon: Layers },
  { href: "/insights", label: "Insights", icon: PieChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/ask", label: "Ask Money", icon: MessageSquare },
];

export function Navbar({
  streak: propStreak,
  freezes: propFreezes,
  savingsRate: propSavingsRate,
  onRefreshData,
}: NavbarProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRecapOpen, setIsRecapOpen] = useState(false);
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [streakData, setStreakData] = useState<UserStreak | null>(null);

  useEffect(() => {
    api.getSpendingSummary().then(setSummary).catch(() => {});
    api.getStreak().then(setStreakData).catch(() => {});
  }, [pathname]);

  const streak = propStreak ?? streakData?.current_streak ?? 6;
  const freezes = propFreezes ?? streakData?.streak_freeze_count ?? 1;
  const savingsRate = propSavingsRate ?? summary?.savings_rate ?? 35;
  const topCategory = summary?.category_breakdown?.[0]?.category || "Food Delivery";
  const topCategoryAmount = summary?.category_breakdown?.[0]?.amount || 0;

  const badges = [
    ...(streak >= 7 ? ["7-Day Habit"] : []),
    ...(savingsRate >= 20 ? ["High Saver (20%+)"] : []),
    ...(streak >= 1 ? ["Active Reviewer"] : []),
    "Rupee Radar Pioneer",
  ];

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (document.documentElement.classList.contains("light")) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 w-full glass-nav border-b border-white/5 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 p-0.5 shadow-md flex items-center justify-center group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-gray-950 rounded-[10px] flex items-center justify-center">
                <span className="text-emerald-400 font-extrabold text-lg">₹</span>
              </div>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                Rupee Radar
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AI
                </span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                    isActive
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navPill"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-600/80 to-emerald-600/80 rounded-full -z-10 shadow-sm"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2.5">
            {/* Weekly Recap Pill */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsRecapOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300"
              title="View Weekly Recap"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Recap
            </motion.button>

            {/* Streak Counter */}
            <StreakBadge
              streak={streak}
              freezes={freezes}
              onClick={() => setIsRecapOpen(true)}
            />

            {/* Add Transaction Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsAddOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add</span>
            </motion.button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Toggle Light/Dark Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav border-t border-white/10 px-2 py-2 flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
                isActive ? "text-emerald-400" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveDot"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400"
                  />
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => onRefreshData && onRefreshData()}
      />

      <WeeklyRecapModal
        isOpen={isRecapOpen}
        onClose={() => setIsRecapOpen(false)}
        savingsRate={savingsRate}
        topCategory={topCategory}
        topCategoryAmount={topCategoryAmount}
        streak={streak}
        badges={badges}
      />
    </>
  );
}

