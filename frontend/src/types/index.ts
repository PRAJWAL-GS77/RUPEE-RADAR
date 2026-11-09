export interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  category: string;
  category_source: "rule" | "ai" | "user";
  confidence: number;
  merchant_clean?: string | null;
  is_reviewed: boolean;
  is_anomaly: boolean;
  anomaly_reason?: string | null;
  is_recurring: boolean;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyTrend {
  year_month: string;
  credit: number;
  debit: number;
  savings: number;
  savings_rate: number;
}

export interface RecurringPayment {
  merchant: string;
  category: string;
  avg_amount: number;
  frequency: string;
  occurrences: number;
  months_active: number;
  latest_date: string;
  is_unused_alert: boolean;
  annual_cost: number;
}

export interface MoneyScore {
  score: number;
  delta: string | null;
  reason: string;
}

export interface SpendingSummary {
  active_month: string;
  days_elapsed: number;
  days_in_month: number;
  days_remaining: number;
  total_income: number;
  total_expense: number;
  current_month_income: number;
  current_month_expense: number;
  current_month_savings: number;
  savings_rate: number;
  daily_burn_rate: number;
  projected_month_end_spend: number;
  safe_to_spend_today: number;
  category_breakdown: CategoryBreakdown[];
  monthly_trends: MonthlyTrend[];
  recurring_payments: RecurringPayment[];
  money_score: MoneyScore;
}

export interface InsightItem {
  title: string;
  detail: string;
  monthly_saving_inr: number;
  difficulty: "easy" | "medium" | "hard";
}

export interface RecommendationsResponse {
  headline: string;
  insights: InsightItem[];
  one_challenge: string;
}

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category_trims?: string | null;
  created_at: string;
}

export interface DailyChallenge {
  id: number;
  date: string;
  title: string;
  potential_saving: number;
  completed: boolean;
}

export interface UserStreak {
  id: number;
  current_streak: number;
  last_active_date: string;
  streak_freeze_count: number;
}

export interface AnomalyItem {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  merchant_clean?: string | null;
  anomaly_reason: string;
}

export interface ChatResponse {
  answer: string;
  query_spec: {
    category?: string | null;
    merchant?: string | null;
    aggregation?: string;
    time_frame?: string;
    type?: string;
  };
  result: {
    value?: number;
    count?: number;
    top_item?: any;
    items?: any[];
  };
}

