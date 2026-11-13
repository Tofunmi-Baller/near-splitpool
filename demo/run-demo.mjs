#!/usr/bin/env node

/**
 * SplitPool Demo — Scripted full-loop walkthrough
 * Runs: create pool → deposit → request spend → vote → approve → settle
 *
 * Usage: npm run demo (starts server automatically)
 */

const API = 'http://localhost:3001/api';
const DELAY = 1200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const log = (emoji, msg) => console.log(`\n  ${emoji}  ${msg}`);
const divider = () => console.log('\n' + '─'.repeat(56));

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${path}: ${text}`);
  }
  return res.json();
}

async function run() {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║         💰  SplitPool — Live Demo Loop          ║
  ║     Group Money, Simple Rules, NEAR-Powered     ║
  ╚══════════════════════════════════════════════════╝
  `);

  // Step 1: Create Pool
  divider();
  log('🏗️', 'Step 1 — Creating pool "Apartment Q4 2027"');
  await sleep(DELAY);

  const pool = await api('/pools', {
    method: 'POST',
    body: {
      name: 'Apartment Q4 2027',
      description: 'Shared expenses for our apartment — rent, groceries, utilities',
      creator: 'alice.testnet',
    },
  });
  log('✅', `Pool created: ${pool.name} (${pool.id})`);
  log('👤', `Creator: alice.testnet (auto-added as member)`);

  // Step 2: Add members
  divider();
  log('👥', 'Step 2 — Inviting roommates');
  await sleep(DELAY);

  for (const m of [
    { nearAccount: 'bob.testnet', displayName: 'Bob' },
    { nearAccount: 'carol.testnet', displayName: 'Carol' },
    { nearAccount: 'dave.testnet', displayName: 'Dave' },
  ]) {
    await api(`/pools/${pool.id}/members`, { method: 'POST', body: m });
    log('➕', `Added ${m.displayName} (${m.nearAccount})`);
    await sleep(400);
  }

  // Step 3: Deposits via NEAR Intents
  divider();
  log('💸', 'Step 3 — Members deposit via NEAR Intents');
  await sleep(DELAY);

  const deposits = [
    { nearAccount: 'alice.testnet', amount: 500, token: 'USDC' },
    { nearAccount: 'bob.testnet', amount: 75, token: 'NEAR' },
    { nearAccount: 'carol.testnet', amount: 300, token: 'USDC' },
    { nearAccount: 'dave.testnet', amount: 200, token: 'wNEAR' },
  ];

  for (const d of deposits) {
    const result = await api(`/pools/${pool.id}/deposit`, { method: 'POST', body: d });
    const swapNote = d.token !== 'USDC' ? ` (swapped from ${d.amount} ${d.token} → $${result.transaction.amount} USDC)` : '';
    log('💰', `${d.nearAccount} deposited $${result.transaction.amount} USDC${swapNote}`);
    log('🔗', `TX: ${result.transaction.tx_hash} [simulated]`);
    await sleep(600);
  }

  // Step 4: Check pool balance
  divider();
  const poolState = await api(`/pools/${pool.id}`);
  log('📊', `Pool balance: $${poolState.balance.toFixed(2)} USDC`);
  log('👥', `Members: ${poolState.members.map((m) => m.display_name).join(', ')}`);

  // Step 5: Spend request (under limit — auto-approved)
  divider();
  log('🛒', 'Step 4 — Alice requests $35 for groceries (under $50 limit)');
  await sleep(DELAY);

  const autoSpend = await api(`/pools/${pool.id}/spend-requests`, {
    method: 'POST',
    body: {
      requestedBy: 'alice.testnet',
      amount: 35,
      description: 'Weekly groceries from Shoprite',
      category: 'groceries',
    },
  });
  log('✅', `Auto-approved! Amount under personal spend limit ($50)`);
  log('🔗', `TX: ${autoSpend.transaction?.tx_hash || 'recorded'} [simulated]`);

  // Step 6: Spend request (over limit — needs votes)
  divider();
  log('🏠', 'Step 5 — Bob requests $800 for rent (over $50 limit → needs votes)');
  await sleep(DELAY);

  const voteSpend = await api(`/pools/${pool.id}/spend-requests`, {
    method: 'POST',
    body: {
      requestedBy: 'bob.testnet',
      amount: 800,
      description: 'November rent to landlord',
      category: 'rent',
    },
  });
  log('🗳️', `Submitted for voting — needs ${voteSpend.request.votes_needed} approvals`);

  // Step 7: Members vote
  divider();
  log('🗳️', 'Step 6 — Members vote on rent payment');
  await sleep(DELAY);

  for (const voter of ['alice.testnet', 'carol.testnet']) {
    await api(`/pools/${pool.id}/spend-requests/${voteSpend.request.id}/vote`, {
      method: 'POST',
      body: { voter, decision: 'approve' },
    });
    log('👍', `${voter} voted APPROVE`);
    await sleep(600);
  }

  const updatedReq = await api(`/pools/${pool.id}/spend-requests?status=approved`);
  const approved = updatedReq.find((r) => r.id === voteSpend.request.id);
  if (approved) {
    log('✅', 'Spend approved by group vote! Transaction executed.');
  }

  // Step 8: Settle up
  divider();
  log('🤝', 'Step 7 — Settle up: who owes who?');
  await sleep(DELAY);

  const settlement = await api(`/pools/${pool.id}/settle`);
  if (settlement.transfers && settlement.transfers.length > 0) {
    for (const t of settlement.transfers) {
      log('💱', `${t.from.display_name} → ${t.to.display_name}: $${t.amount.toFixed(2)}`);
    }
  } else {
    log('🎉', 'Everyone is even!');
  }

  // Summary
  divider();
  const finalPool = await api(`/pools/${pool.id}`);
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║               ✅  Demo Complete!                ║
  ╠══════════════════════════════════════════════════╣
  ║  Pool: ${finalPool.name.padEnd(41)}║
  ║  Balance: $${finalPool.balance.toFixed(2).padEnd(38)}║
  ║  Members: ${String(finalPool.members.length).padEnd(39)}║
  ║  Transactions: view at /pool/${pool.id.slice(0, 8)}...   ║
  ╠══════════════════════════════════════════════════╣
  ║  Full flow: create → deposit → spend → vote →   ║
  ║  approve → settle — all powered by NEAR Intents ║
  ╚══════════════════════════════════════════════════╝
  `);
}

// Check server is running
try {
  await fetch(`${API}/pools`);
} catch {
  console.error('\n  ❌  Server not running. Start with: npm run dev:server\n');
  process.exit(1);
}

run().catch((err) => {
  console.error('\n  ❌  Demo error:', err.message);
  process.exit(1);
});
