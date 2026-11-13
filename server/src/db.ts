import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'splitpool.db');

const db = new Database(dbPath);

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Auto-create tables on import
db.exec(`
  CREATE TABLE IF NOT EXISTS pools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    creator TEXT NOT NULL,
    currency TEXT DEFAULT 'USDC',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    pool_id TEXT NOT NULL,
    near_account TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_color TEXT NOT NULL,
    contribution REAL DEFAULT 0,
    joined_at TEXT NOT NULL,
    FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    pool_id TEXT NOT NULL,
    rule_type TEXT NOT NULL,
    config TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS spend_requests (
    id TEXT PRIMARY KEY,
    pool_id TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    category TEXT,
    status TEXT DEFAULT 'pending',
    votes_needed INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    voter TEXT NOT NULL,
    decision TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (request_id) REFERENCES spend_requests(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    pool_id TEXT NOT NULL,
    tx_type TEXT NOT NULL,
    from_account TEXT,
    to_account TEXT,
    amount REAL NOT NULL,
    description TEXT,
    category TEXT,
    tx_hash TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE
  );
`);

export { db };
