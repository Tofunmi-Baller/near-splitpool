import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '../db.js';
import { simulateDeposit, simulateTransfer, generateTxHash } from '../near/intents.js';
import { evaluateSpendRequest } from '../engine/rules.js';

const router = Router();

const AVATAR_COLORS = [
  '#6366F1', '#EC4899', '#F59E0B', '#10B981',
  '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6',
];

const CATEGORIES = [
  'groceries', 'rent', 'utilities', 'transport',
  'food', 'entertainment', 'supplies', 'other',
] as const;

function randomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// ── Zod Schemas ──────────────────────────────────────────────

const CreatePoolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  creator: z.string().min(1),
});

const AddMemberSchema = z.object({
  nearAccount: z.string().min(1),
  displayName: z.string().min(1),
});

const DepositSchema = z.object({
  nearAccount: z.string().min(1),
  amount: z.number().positive(),
  token: z.string().min(1),
});

const SpendRequestSchema = z.object({
  requestedBy: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().min(1),
  category: z.enum(CATEGORIES),
});

const VoteSchema = z.object({
  voter: z.string().min(1),
  decision: z.enum(['approve', 'reject']),
});

const RuleSchema = z.object({
  rule_type: z.string(),
  config: z.record(z.unknown()),
  enabled: z.number().int().min(0).max(1).optional().default(1),
});

const RulesArraySchema = z.array(RuleSchema);

const PatchRuleSchema = z.object({
  config: z.record(z.unknown()).optional(),
  enabled: z.number().int().min(0).max(1).optional(),
});

// ── Helper ───────────────────────────────────────────────────

function getPoolBalance(poolId: string): number {
  const deposits = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE pool_id = ? AND tx_type = 'deposit'`
    )
    .get(poolId) as { total: number };

  const spends = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE pool_id = ? AND tx_type = 'spend'`
    )
    .get(poolId) as { total: number };

  const settlements = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE pool_id = ? AND tx_type = 'settlement'`
    )
    .get(poolId) as { total: number };

  return parseFloat((deposits.total - spends.total - settlements.total).toFixed(2));
}

// ── Pools ────────────────────────────────────────────────────

router.post('/pools', (req, res) => {
  const parsed = CreatePoolSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { name, description, creator } = parsed.data;
  const poolId = nanoid();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO pools (id, name, description, creator, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(poolId, name, description ?? null, creator, now);

  // Auto-add creator as member
  const memberId = nanoid();
  const creatorName = creator.replace('.testnet', '').replace('.near', '');
  db.prepare(
    `INSERT INTO members (id, pool_id, near_account, display_name, avatar_color, joined_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(memberId, poolId, creator, creatorName, randomColor(), now);

  // Default rules
  db.prepare(
    `INSERT INTO rules (id, pool_id, rule_type, config, enabled) VALUES (?, ?, ?, ?, 1)`
  ).run(nanoid(), poolId, 'personal_spend_limit', JSON.stringify({ limit: 50 }));

  db.prepare(
    `INSERT INTO rules (id, pool_id, rule_type, config, enabled) VALUES (?, ?, ?, ?, 1)`
  ).run(nanoid(), poolId, 'vote_threshold', JSON.stringify({ threshold: 2 }));

  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(poolId);
  res.status(201).json(pool);
});

router.get('/pools', (req, res) => {
  const account = req.query.account as string | undefined;

  if (account) {
    const pools = db
      .prepare(
        `SELECT p.* FROM pools p
         JOIN members m ON m.pool_id = p.id
         WHERE m.near_account = ?
         ORDER BY p.created_at DESC`
      )
      .all(account);
    res.json(pools);
  } else {
    const pools = db.prepare('SELECT * FROM pools ORDER BY created_at DESC').all();
    res.json(pools);
  }
});

router.get('/pools/:id', (req, res) => {
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id) as any;
  if (!pool) {
    res.status(404).json({ error: 'Pool not found' });
    return;
  }

  const members = db.prepare('SELECT * FROM members WHERE pool_id = ?').all(pool.id);
  const rules = db.prepare('SELECT * FROM rules WHERE pool_id = ?').all(pool.id);
  const balance = getPoolBalance(pool.id);

  res.json({ ...pool, members, rules, balance });
});

// ── Members ──────────────────────────────────────────────────

router.post('/pools/:id/members', (req, res) => {
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  if (!pool) {
    res.status(404).json({ error: 'Pool not found' });
    return;
  }

  const parsed = AddMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { nearAccount, displayName } = parsed.data;

  // Check for duplicate membership
  const existing = db
    .prepare('SELECT * FROM members WHERE pool_id = ? AND near_account = ?')
    .get(req.params.id, nearAccount);
  if (existing) {
    res.status(400).json({ error: 'Account is already a member of this pool' });
    return;
  }

  const memberId = nanoid();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO members (id, pool_id, near_account, display_name, avatar_color, joined_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(memberId, req.params.id, nearAccount, displayName, randomColor(), now);

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
  res.status(201).json(member);
});

router.delete('/pools/:id/members/:memberId', (req, res) => {
  const member = db
    .prepare('SELECT * FROM members WHERE id = ? AND pool_id = ?')
    .get(req.params.memberId, req.params.id);

  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.memberId);
  res.json({ success: true });
});

// ── Deposits ─────────────────────────────────────────────────

router.post('/pools/:id/deposit', async (req, res) => {
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  if (!pool) {
    res.status(404).json({ error: 'Pool not found' });
    return;
  }

  const parsed = DepositSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { nearAccount, amount, token } = parsed.data;

  // Verify the depositor is a member
  const member = db
    .prepare('SELECT * FROM members WHERE pool_id = ? AND near_account = ?')
    .get(req.params.id, nearAccount) as any;
  if (!member) {
    res.status(400).json({ error: 'Account is not a member of this pool' });
    return;
  }

  const result = await simulateDeposit(nearAccount, amount, token);
  const now = new Date().toISOString();

  // Record transaction
  const txId = nanoid();
  db.prepare(
    `INSERT INTO transactions (id, pool_id, tx_type, from_account, to_account, amount, description, tx_hash, created_at)
     VALUES (?, ?, 'deposit', ?, ?, ?, ?, ?, ?)`
  ).run(
    txId,
    req.params.id,
    nearAccount,
    req.params.id,
    result.amountUSDC,
    `Deposit ${amount} ${token}${result.swapped ? ` (swapped to ${result.amountUSDC} USDC)` : ''}`,
    result.txHash,
    now
  );

  // Update member contribution
  db.prepare(
    `UPDATE members SET contribution = contribution + ? WHERE id = ?`
  ).run(result.amountUSDC, member.id);

  res.status(201).json({
    transaction: db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId),
    deposit: result,
  });
});

// ── Spend Requests ───────────────────────────────────────────

router.post('/pools/:id/spend-requests', (req, res) => {
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  if (!pool) {
    res.status(404).json({ error: 'Pool not found' });
    return;
  }

  const parsed = SpendRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { requestedBy, amount, description, category } = parsed.data;

  // Check balance
  const balance = getPoolBalance(req.params.id);
  if (amount > balance) {
    res.status(400).json({ error: `Insufficient pool balance (${balance} USDC available)` });
    return;
  }

  // Run through rules engine
  const evaluation = evaluateSpendRequest(db, req.params.id, {
    requestedBy,
    amount,
    description,
    category,
  });

  const now = new Date().toISOString();

  if (evaluation.autoRejected) {
    // Create a rejected request
    const reqId = nanoid();
    db.prepare(
      `INSERT INTO spend_requests (id, pool_id, requested_by, amount, description, category, status, votes_needed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'rejected', 0, ?)`
    ).run(reqId, req.params.id, requestedBy, amount, description, category, now);

    res.status(201).json({
      request: db.prepare('SELECT * FROM spend_requests WHERE id = ?').get(reqId),
      evaluation,
    });
    return;
  }

  if (evaluation.autoApproved) {
    // Auto-approve: create request + transaction immediately
    const reqId = nanoid();
    db.prepare(
      `INSERT INTO spend_requests (id, pool_id, requested_by, amount, description, category, status, votes_needed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'approved', 0, ?)`
    ).run(reqId, req.params.id, requestedBy, amount, description, category, now);

    const txId = nanoid();
    db.prepare(
      `INSERT INTO transactions (id, pool_id, tx_type, from_account, to_account, amount, description, category, tx_hash, created_at)
       VALUES (?, ?, 'spend', ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      txId,
      req.params.id,
      req.params.id,
      requestedBy,
      amount,
      description,
      category,
      generateTxHash(),
      now
    );

    res.status(201).json({
      request: db.prepare('SELECT * FROM spend_requests WHERE id = ?').get(reqId),
      transaction: db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId),
      evaluation,
    });
    return;
  }

  // Pending — needs votes
  const reqId = nanoid();
  db.prepare(
    `INSERT INTO spend_requests (id, pool_id, requested_by, amount, description, category, status, votes_needed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(
    reqId,
    req.params.id,
    requestedBy,
    amount,
    description,
    category,
    evaluation.votesNeeded ?? 1,
    now
  );

  res.status(201).json({
    request: db.prepare('SELECT * FROM spend_requests WHERE id = ?').get(reqId),
    evaluation,
  });
});

router.get('/pools/:id/spend-requests', (req, res) => {
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  if (!pool) {
    res.status(404).json({ error: 'Pool not found' });
    return;
  }

  const status = req.query.status as string | undefined;
  let requests;

  if (status) {
    requests = db
      .prepare('SELECT * FROM spend_requests WHERE pool_id = ? AND status = ? ORDER BY created_at DESC')
      .all(req.params.id, status);
  } else {
    requests = db
      .prepare('SELECT * FROM spend_requests WHERE pool_id = ? ORDER BY created_at DESC')
      .all(req.params.id);
  }

  // Attach votes to each request
  const enriched = (requests as any[]).map((r) => {
    const votes = db.prepare('SELECT * FROM votes WHERE request_id = ?').all(r.id);
    return { ...r, votes };
  });

  res.json(enriched);
});

router.post('/pools/:id/spend-requests/:reqId/vote', (req, res) => {
  const request = db
    .prepare('SELECT * FROM spend_requests WHERE id = ? AND pool_id = ?')
    .get(req.params.reqId, req.params.id) as any;

  if (!request) {
    res.status(404).json({ error: 'Spend request not found' });
    return;
  }

  if (request.status !== 'pending') {
    res.status(400).json({ error: `Request is already ${request.status}` });
    return;
  }

  const parsed = VoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { voter, decision } = parsed.data;

  // Check duplicate vote
  const existingVote = db
    .prepare('SELECT * FROM votes WHERE request_id = ? AND voter = ?')
    .get(req.params.reqId, voter);
  if (existingVote) {
    res.status(400).json({ error: 'Already voted on this request' });
    return;
  }

  // Record vote
  const voteId = nanoid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO votes (id, request_id, voter, decision, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(voteId, req.params.reqId, voter, decision, now);

  // Count votes
  const approvals = db
    .prepare(`SELECT COUNT(*) as count FROM votes WHERE request_id = ? AND decision = 'approve'`)
    .get(req.params.reqId) as { count: number };

  const rejections = db
    .prepare(`SELECT COUNT(*) as count FROM votes WHERE request_id = ? AND decision = 'reject'`)
    .get(req.params.reqId) as { count: number };

  const memberCount = db
    .prepare('SELECT COUNT(*) as count FROM members WHERE pool_id = ?')
    .get(req.params.id) as { count: number };

  let newStatus = 'pending';

  // Auto-approve if enough approvals
  if (approvals.count >= request.votes_needed) {
    newStatus = 'approved';
    db.prepare(`UPDATE spend_requests SET status = 'approved' WHERE id = ?`).run(req.params.reqId);

    // Create the spend transaction
    const txId = nanoid();
    db.prepare(
      `INSERT INTO transactions (id, pool_id, tx_type, from_account, to_account, amount, description, category, tx_hash, created_at)
       VALUES (?, ?, 'spend', ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      txId,
      req.params.id,
      req.params.id,
      request.requested_by,
      request.amount,
      request.description,
      request.category,
      generateTxHash(),
      now
    );
  }

  // Auto-reject if majority rejects (rejections exceed half of members)
  if (rejections.count > Math.floor(memberCount.count / 2)) {
    newStatus = 'rejected';
    db.prepare(`UPDATE spend_requests SET status = 'rejected' WHERE id = ?`).run(req.params.reqId);
  }

  const updatedRequest = db.prepare('SELECT * FROM spend_requests WHERE id = ?').get(req.params.reqId);
  const allVotes = db.prepare('SELECT * FROM votes WHERE request_id = ?').all(req.params.reqId);

  res.status(201).json({
    request: updatedRequest,
    votes: allVotes,
    status: newStatus,
  });
});

// ── Rules ────────────────────────────────────────────────────

router.get('/pools/:id/rules', (req, res) => {
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  if (!pool) {
    res.status(404).json({ error: 'Pool not found' });
    return;
  }

  const rules = db.prepare('SELECT * FROM rules WHERE pool_id = ?').all(req.params.id);

  // Parse config JSON for the response
  const parsed = (rules as any[]).map((r) => ({
    ...r,
    config: JSON.parse(r.config),
  }));

  res.json(parsed);
});

router.put('/pools/:id/rules', (req, res) => {
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  if (!pool) {
    res.status(404).json({ error: 'Pool not found' });
    return;
  }

  const parsed = RulesArraySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Replace all rules in a transaction
  const replaceRules = db.transaction((newRules: z.infer<typeof RulesArraySchema>) => {
    db.prepare('DELETE FROM rules WHERE pool_id = ?').run(req.params.id);

    for (const rule of newRules) {
      db.prepare(
        `INSERT INTO rules (id, pool_id, rule_type, config, enabled) VALUES (?, ?, ?, ?, ?)`
      ).run(nanoid(), req.params.id, rule.rule_type, JSON.stringify(rule.config), rule.enabled);
    }
  });

  replaceRules(parsed.data);

  const rules = db.prepare('SELECT * FROM rules WHERE pool_id = ?').all(req.params.id);
  const result = (rules as any[]).map((r) => ({ ...r, config: JSON.parse(r.config) }));
  res.json(result);
});

router.patch('/pools/:id/rules/:ruleId', (req, res) => {
  const rule = db
    .prepare('SELECT * FROM rules WHERE id = ? AND pool_id = ?')
    .get(req.params.ruleId, req.params.id) as any;

  if (!rule) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  const parsed = PatchRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { config, enabled } = parsed.data;

  if (config !== undefined) {
    db.prepare('UPDATE rules SET config = ? WHERE id = ?').run(JSON.stringify(config), req.params.ruleId);
  }
  if (enabled !== undefined) {
    db.prepare('UPDATE rules SET enabled = ? WHERE id = ?').run(enabled, req.params.ruleId);
  }

  const updated = db.prepare('SELECT * FROM rules WHERE id = ?').get(req.params.ruleId) as any;
  res.json({ ...updated, config: JSON.parse(updated.config) });
});

// ── Settlement ───────────────────────────────────────────────

router.get('/pools/:id/settle', (req, res) => {
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  if (!pool) {
    res.status(404).json({ error: 'Pool not found' });
    return;
  }

  const members = db.prepare('SELECT * FROM members WHERE pool_id = ?').all(req.params.id) as any[];
  if (members.length === 0) {
    res.json({ settlements: [] });
    return;
  }

  // Total spent from the pool
  const totalSpent = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE pool_id = ? AND tx_type = 'spend'`
    )
    .get(req.params.id) as { total: number };

  const fairShare = totalSpent.total / members.length;

  // Each member's balance: contribution - fairShare
  // Positive = overpaid (owed money back), Negative = underpaid (owes money)
  const balances = members.map((m) => ({
    nearAccount: m.near_account,
    displayName: m.display_name,
    contribution: m.contribution,
    fairShare: parseFloat(fairShare.toFixed(2)),
    balance: parseFloat((m.contribution - fairShare).toFixed(2)),
  }));

  // Calculate settlements using the min-transfers algorithm
  const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ ...b, remaining: Math.abs(b.balance) }));
  const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ ...b, remaining: b.balance }));

  const settlements: { from: string; to: string; amount: number }[] = [];

  // Sort to minimize number of transfers
  debtors.sort((a, b) => b.remaining - a.remaining);
  creditors.sort((a, b) => b.remaining - a.remaining);

  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = parseFloat(Math.min(debtors[i].remaining, creditors[j].remaining).toFixed(2));
    if (amount > 0.01) {
      settlements.push({
        from: debtors[i].nearAccount,
        to: creditors[j].nearAccount,
        amount,
      });
    }
    debtors[i].remaining = parseFloat((debtors[i].remaining - amount).toFixed(2));
    creditors[j].remaining = parseFloat((creditors[j].remaining - amount).toFixed(2));

    if (debtors[i].remaining < 0.01) i++;
    if (creditors[j].remaining < 0.01) j++;
  }

  res.json({ balances, settlements });
});

router.post('/pools/:id/settle/execute', async (req, res) => {
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  if (!pool) {
    res.status(404).json({ error: 'Pool not found' });
    return;
  }

  // Calculate settlements first (same logic as GET)
  const members = db.prepare('SELECT * FROM members WHERE pool_id = ?').all(req.params.id) as any[];
  const totalSpent = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE pool_id = ? AND tx_type = 'spend'`
    )
    .get(req.params.id) as { total: number };

  const fairShare = totalSpent.total / members.length;
  const balances = members.map((m) => ({
    nearAccount: m.near_account,
    contribution: m.contribution,
    balance: parseFloat((m.contribution - fairShare).toFixed(2)),
  }));

  const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ ...b, remaining: Math.abs(b.balance) }));
  const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ ...b, remaining: b.balance }));

  debtors.sort((a, b) => b.remaining - a.remaining);
  creditors.sort((a, b) => b.remaining - a.remaining);

  const settlements: { from: string; to: string; amount: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = parseFloat(Math.min(debtors[i].remaining, creditors[j].remaining).toFixed(2));
    if (amount > 0.01) {
      settlements.push({ from: debtors[i].nearAccount, to: creditors[j].nearAccount, amount });
    }
    debtors[i].remaining = parseFloat((debtors[i].remaining - amount).toFixed(2));
    creditors[j].remaining = parseFloat((creditors[j].remaining - amount).toFixed(2));
    if (debtors[i].remaining < 0.01) i++;
    if (creditors[j].remaining < 0.01) j++;
  }

  // Execute each settlement
  const results = [];
  for (const s of settlements) {
    const transferResult = await simulateTransfer(req.params.id, s.to, s.amount);
    const now = new Date().toISOString();
    const txId = nanoid();

    db.prepare(
      `INSERT INTO transactions (id, pool_id, tx_type, from_account, to_account, amount, description, tx_hash, created_at)
       VALUES (?, ?, 'settlement', ?, ?, ?, ?, ?, ?)`
    ).run(
      txId,
      req.params.id,
      s.from,
      s.to,
      s.amount,
      `Settlement: ${s.from} -> ${s.to}`,
      transferResult.txHash,
      now
    );

    results.push({
      settlement: s,
      transaction: db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId),
      transfer: transferResult,
    });
  }

  res.status(201).json({ executed: results });
});

// ── Ledger ───────────────────────────────────────────────────

router.get('/pools/:id/ledger', (req, res) => {
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  if (!pool) {
    res.status(404).json({ error: 'Pool not found' });
    return;
  }

  let query = 'SELECT * FROM transactions WHERE pool_id = ?';
  const params: any[] = [req.params.id];

  const member = req.query.member as string | undefined;
  if (member) {
    query += ' AND (from_account = ? OR to_account = ?)';
    params.push(member, member);
  }

  const category = req.query.category as string | undefined;
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  const from = req.query.from as string | undefined;
  if (from) {
    query += ' AND created_at >= ?';
    params.push(from);
  }

  const to = req.query.to as string | undefined;
  if (to) {
    query += ' AND created_at <= ?';
    params.push(to);
  }

  query += ' ORDER BY created_at DESC';

  const transactions = db.prepare(query).all(...params);
  res.json(transactions);
});

// ── Demo Seed ────────────────────────────────────────────────

router.post('/seed', (req, res) => {
  // Clear existing data
  db.prepare('DELETE FROM votes').run();
  db.prepare('DELETE FROM transactions').run();
  db.prepare('DELETE FROM spend_requests').run();
  db.prepare('DELETE FROM rules').run();
  db.prepare('DELETE FROM members').run();
  db.prepare('DELETE FROM pools').run();

  const poolId = nanoid();
  const now = new Date();

  // Helper to make past dates
  const daysAgo = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    return date.toISOString();
  };

  // Create pool
  db.prepare(
    `INSERT INTO pools (id, name, description, creator, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(poolId, 'Apartment Q4', 'Shared expenses for Q4 2026 - rent, groceries, utilities', 'alice.testnet', daysAgo(30));

  // Members
  const memberData = [
    { account: 'alice.testnet', name: 'Alice', color: '#6366F1', contribution: 1200 },
    { account: 'bob.testnet', name: 'Bob', color: '#EC4899', contribution: 800 },
    { account: 'carol.testnet', name: 'Carol', color: '#10B981', contribution: 950 },
    { account: 'dave.testnet', name: 'Dave', color: '#F59E0B', contribution: 600 },
  ];

  const memberIds: Record<string, string> = {};
  for (const m of memberData) {
    const id = nanoid();
    memberIds[m.account] = id;
    db.prepare(
      `INSERT INTO members (id, pool_id, near_account, display_name, avatar_color, contribution, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, poolId, m.account, m.name, m.color, m.contribution, daysAgo(30));
  }

  // Rules
  const ruleIds = {
    spendLimit: nanoid(),
    voteThreshold: nanoid(),
    groceryBudget: nanoid(),
    entertainmentBudget: nanoid(),
  };

  db.prepare(
    `INSERT INTO rules (id, pool_id, rule_type, config, enabled) VALUES (?, ?, ?, ?, 1)`
  ).run(ruleIds.spendLimit, poolId, 'personal_spend_limit', JSON.stringify({ limit: 50 }));

  db.prepare(
    `INSERT INTO rules (id, pool_id, rule_type, config, enabled) VALUES (?, ?, ?, ?, 1)`
  ).run(ruleIds.voteThreshold, poolId, 'vote_threshold', JSON.stringify({ threshold: 2 }));

  db.prepare(
    `INSERT INTO rules (id, pool_id, rule_type, config, enabled) VALUES (?, ?, ?, ?, 1)`
  ).run(
    ruleIds.groceryBudget,
    poolId,
    'category_budget',
    JSON.stringify({ category: 'groceries', limit: 600, period: 'monthly' })
  );

  db.prepare(
    `INSERT INTO rules (id, pool_id, rule_type, config, enabled) VALUES (?, ?, ?, ?, 1)`
  ).run(
    ruleIds.entertainmentBudget,
    poolId,
    'category_budget',
    JSON.stringify({ category: 'entertainment', limit: 200, period: 'monthly' })
  );

  // Deposit transactions
  const deposits = [
    { from: 'alice.testnet', amount: 1200, days: 28 },
    { from: 'bob.testnet', amount: 800, days: 27 },
    { from: 'carol.testnet', amount: 950, days: 26 },
    { from: 'dave.testnet', amount: 600, days: 25 },
  ];

  for (const d of deposits) {
    db.prepare(
      `INSERT INTO transactions (id, pool_id, tx_type, from_account, to_account, amount, description, tx_hash, created_at)
       VALUES (?, ?, 'deposit', ?, ?, ?, ?, ?, ?)`
    ).run(
      nanoid(), poolId, d.from, poolId, d.amount,
      `Deposit ${d.amount} USDC`, generateTxHash(), daysAgo(d.days)
    );
  }

  // Approved spend transactions
  const spends = [
    { by: 'alice.testnet', amount: 245.00, desc: 'Monthly groceries run', cat: 'groceries', days: 20 },
    { by: 'bob.testnet', amount: 1100.00, desc: 'October rent share', cat: 'rent', days: 18 },
    { by: 'carol.testnet', amount: 85.50, desc: 'Electric bill', cat: 'utilities', days: 15 },
    { by: 'dave.testnet', amount: 42.00, desc: 'Pizza night', cat: 'food', days: 12 },
    { by: 'alice.testnet', amount: 38.99, desc: 'Cleaning supplies', cat: 'supplies', days: 10 },
    { by: 'bob.testnet', amount: 120.00, desc: 'Internet bill', cat: 'utilities', days: 8 },
    { by: 'carol.testnet', amount: 67.50, desc: 'Group dinner out', cat: 'entertainment', days: 5 },
    { by: 'dave.testnet', amount: 25.00, desc: 'Uber to airport', cat: 'transport', days: 3 },
  ];

  const spendRequestIds: string[] = [];
  for (const s of spends) {
    const reqId = nanoid();
    spendRequestIds.push(reqId);
    db.prepare(
      `INSERT INTO spend_requests (id, pool_id, requested_by, amount, description, category, status, votes_needed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'approved', 2, ?)`
    ).run(reqId, poolId, s.by, s.amount, s.desc, s.cat, daysAgo(s.days));

    db.prepare(
      `INSERT INTO transactions (id, pool_id, tx_type, from_account, to_account, amount, description, category, tx_hash, created_at)
       VALUES (?, ?, 'spend', ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      nanoid(), poolId, poolId, s.by, s.amount, s.desc, s.cat, generateTxHash(), daysAgo(s.days)
    );
  }

  // Pending spend request with votes
  const pendingReqId = nanoid();
  db.prepare(
    `INSERT INTO spend_requests (id, pool_id, requested_by, amount, description, category, status, votes_needed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', 2, ?)`
  ).run(pendingReqId, poolId, 'carol.testnet', 180.00, 'New vacuum cleaner', 'supplies', daysAgo(1));

  // One approve vote from alice, still needs one more
  db.prepare(
    `INSERT INTO votes (id, request_id, voter, decision, created_at)
     VALUES (?, ?, ?, 'approve', ?)`
  ).run(nanoid(), pendingReqId, 'alice.testnet', daysAgo(1));

  // Summary
  const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
  const totalSpends = spends.reduce((sum, s) => sum + s.amount, 0);

  res.status(201).json({
    message: 'Demo data seeded successfully',
    poolId,
    summary: {
      members: memberData.length,
      deposits: deposits.length,
      approvedSpends: spends.length,
      pendingRequests: 1,
      totalDeposited: totalDeposits,
      totalSpent: totalSpends,
      balance: parseFloat((totalDeposits - totalSpends).toFixed(2)),
      rules: Object.keys(ruleIds).length,
    },
  });
});

export { router };
