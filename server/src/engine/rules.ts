import type Database from 'better-sqlite3';

interface SpendRequest {
  requestedBy: string;
  amount: number;
  description: string;
  category: string;
}

interface RuleRow {
  id: string;
  pool_id: string;
  rule_type: string;
  config: string;
  enabled: number;
}

interface EvaluationResult {
  autoApproved: boolean;
  autoRejected?: boolean;
  rejectReason?: string;
  votesNeeded?: number;
  appliedRules: string[];
}

export function evaluateSpendRequest(
  db: Database.Database,
  poolId: string,
  request: SpendRequest
): EvaluationResult {
  const rules = db
    .prepare('SELECT * FROM rules WHERE pool_id = ? AND enabled = 1')
    .all(poolId) as RuleRow[];

  const appliedRules: string[] = [];
  let votesNeeded = 0;

  // Check lockout first — if the pool is locked, reject immediately
  const lockoutRule = rules.find((r) => r.rule_type === 'lockout');
  if (lockoutRule) {
    const config = JSON.parse(lockoutRule.config) as { locked: boolean; reason: string };
    if (config.locked) {
      return {
        autoApproved: false,
        autoRejected: true,
        rejectReason: `Pool is locked: ${config.reason}`,
        appliedRules: ['lockout'],
      };
    }
  }

  // Check category_budget — if category spend would exceed budget, reject
  const categoryBudgetRules = rules.filter((r) => r.rule_type === 'category_budget');
  for (const rule of categoryBudgetRules) {
    const config = JSON.parse(rule.config) as {
      category: string;
      limit: number;
      period: 'monthly' | 'weekly';
    };

    if (config.category === request.category) {
      appliedRules.push('category_budget');

      // Calculate period start
      const now = new Date();
      let periodStart: Date;
      if (config.period === 'monthly') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        const dayOfWeek = now.getDay();
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - dayOfWeek);
        periodStart.setHours(0, 0, 0, 0);
      }

      // Sum approved transactions in this category for the period
      const spent = db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
           WHERE pool_id = ? AND category = ? AND tx_type = 'spend'
           AND created_at >= ?`
        )
        .get(poolId, config.category, periodStart.toISOString()) as { total: number };

      if (spent.total + request.amount > config.limit) {
        return {
          autoApproved: false,
          autoRejected: true,
          rejectReason: `Category "${config.category}" budget exceeded (${spent.total + request.amount}/${config.limit} for ${config.period} period)`,
          appliedRules,
        };
      }
    }
  }

  // Check personal_spend_limit — if amount is within personal limit, auto-approve
  const spendLimitRule = rules.find((r) => r.rule_type === 'personal_spend_limit');
  if (spendLimitRule) {
    const config = JSON.parse(spendLimitRule.config) as { limit: number };
    appliedRules.push('personal_spend_limit');

    if (request.amount <= config.limit) {
      return {
        autoApproved: true,
        appliedRules,
      };
    }
  }

  // Check vote_threshold — how many votes are needed
  const voteRule = rules.find((r) => r.rule_type === 'vote_threshold');
  if (voteRule) {
    const config = JSON.parse(voteRule.config) as { threshold: number };
    appliedRules.push('vote_threshold');

    // If threshold < 1, treat as percentage of members
    if (config.threshold < 1) {
      const memberCount = db
        .prepare('SELECT COUNT(*) as count FROM members WHERE pool_id = ?')
        .get(poolId) as { count: number };
      votesNeeded = Math.ceil(memberCount.count * config.threshold);
    } else {
      votesNeeded = config.threshold;
    }
  }

  // Default: require at least 1 vote if no rule matched
  if (votesNeeded === 0 && appliedRules.length === 0) {
    votesNeeded = 1;
  }

  return {
    autoApproved: false,
    votesNeeded: votesNeeded || 1,
    appliedRules,
  };
}
