import {
  Transaction,
  SpendingSummary,
  RecommendationsResponse,
  Goal,
  DailyChallenge,
  UserStreak,
  AnomalyItem,
  ChatResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Analytics
  getSpendingSummary: async (): Promise<SpendingSummary> => {
    return fetchJson<SpendingSummary>(`${API_BASE}/analytics/summary`);
  },

  getStreak: async (): Promise<UserStreak> => {
    return fetchJson<UserStreak>(`${API_BASE}/analytics/streak`);
  },

  checkInStreak: async (): Promise<UserStreak> => {
    return fetchJson<UserStreak>(`${API_BASE}/analytics/streak/check-in`, {
      method: "POST",
    });
  },

  // Transactions
  getTransactions: async (params?: { category?: string; unreviewed_only?: boolean; limit?: number }): Promise<Transaction[]> => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.unreviewed_only) q.set("unreviewed_only", "true");
    if (params?.limit) q.set("limit", params.limit.toString());
    return fetchJson<Transaction[]>(`${API_BASE}/transactions?${q.toString()}`);
  },

  getReviewQueue: async (): Promise<Transaction[]> => {
    return fetchJson<Transaction[]>(`${API_BASE}/transactions/review-queue`);
  },

  reviewTransaction: async (txnId: number, data: { category: string; merchant_clean?: string; confirmed: boolean }) => {
    return fetchJson<{ status: string; transaction: Transaction }>(
      `${API_BASE}/transactions/${txnId}/review`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  parseNaturalLanguage: async (text: string): Promise<any> => {
    return fetchJson<any>(`${API_BASE}/transactions/parse-nl`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  createTransaction: async (data: Partial<Transaction>): Promise<Transaction> => {
    return fetchJson<Transaction>(`${API_BASE}/transactions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  batchCategorize: async (): Promise<{ status: string; updated: number }> => {
    return fetchJson<{ status: string; updated: number }>(
      `${API_BASE}/transactions/batch-categorize`,
      { method: "POST" }
    );
  },

  resetDemo: async (): Promise<{ status: string; message: string }> => {
    return fetchJson<{ status: string; message: string }>(
      `${API_BASE}/transactions/reset-demo`,
      { method: "POST" }
    );
  },

  // Anomalies
  getAnomalies: async (): Promise<AnomalyItem[]> => {
    return fetchJson<AnomalyItem[]>(`${API_BASE}/anomalies`);
  },

  dismissAnomaly: async (txnId: number) => {
    return fetchJson<{ status: string }>(`${API_BASE}/anomalies/dismiss/${txnId}`, {
      method: "POST",
    });
  },

  // Recommendations & Challenges
  getRecommendations: async (): Promise<RecommendationsResponse> => {
    return fetchJson<RecommendationsResponse>(`${API_BASE}/recommendations`);
  },

  getDailyChallenge: async (): Promise<DailyChallenge> => {
    return fetchJson<DailyChallenge>(`${API_BASE}/recommendations/daily-challenge`);
  },

  toggleDailyChallenge: async (): Promise<DailyChallenge> => {
    return fetchJson<DailyChallenge>(
      `${API_BASE}/recommendations/daily-challenge/toggle`,
      { method: "POST" }
    );
  },

  // Goals
  getGoals: async (): Promise<Goal[]> => {
    return fetchJson<Goal[]>(`${API_BASE}/goals`);
  },

  createGoal: async (data: { name: string; target_amount: number; target_date: string; current_amount?: number }): Promise<Goal> => {
    return fetchJson<Goal>(`${API_BASE}/goals`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  addFundsToGoal: async (goalId: number, amount_to_add: number): Promise<Goal> => {
    return fetchJson<Goal>(`${API_BASE}/goals/${goalId}/add-funds`, {
      method: "POST",
      body: JSON.stringify({ amount_to_add }),
    });
  },

  deleteGoal: async (goalId: number) => {
    return fetchJson<{ status: string }>(`${API_BASE}/goals/${goalId}`, {
      method: "DELETE",
    });
  },

  // Chat
  sendChatMessage: async (message: string): Promise<ChatResponse> => {
    return fetchJson<ChatResponse>(`${API_BASE}/chat`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },
};

