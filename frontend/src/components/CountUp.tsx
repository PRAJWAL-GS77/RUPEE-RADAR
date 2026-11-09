"use client";

import { useEffect, useState } from "react";
import { formatRupee } from "@/lib/utils";

interface CountUpProps {
  value: number;
  duration?: number;
  isCurrency?: boolean;
  prefix?: string;
  suffix?: string;
  compact?: boolean;
}

export function CountUp({
  value,
  duration = 1.0,
  isCurrency = false,
  prefix = "",
  suffix = "",
  compact = false,
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startVal = 0;
    const endVal = value;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  if (isCurrency) {
    return (
      <span className="tabular-nums">
        {formatRupee(Math.round(displayValue), compact)}
      </span>
    );
  }

  return (
    <span className="tabular-nums">
      {prefix}
      {Math.round(displayValue)}
      {suffix}
    </span>
  );
}

