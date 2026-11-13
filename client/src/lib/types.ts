export interface Pool {
  id: string;
  name: string;
  description: string;
  creator: string;
  currency: string;
  created_at: string;
  balance: number;
  members: Member[];
  rules: Rule[];
}

export interface Member {
  id: string;
  pool_id: string;
  near_account: string;
  display_name: string;
  avatar_color: string;
  contribution: number;
  joined_at: string;
}

export interface Rule {
  id: string;
  pool_id: string;
  rule_type: string;
  config: any;
  enabled: number;
}

export interface SpendRequest {
  id: string;
  pool_id: string;
  requested_by: string;
  amount: number;
  description: string;
  category: string;
  status: string;
  votes_needed: number;
  created_at: string;
  votes?: Vote[];
}

export interface Vote {
  id: string;
  request_id: string;
  voter: string;
  decision: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  pool_id: string;
  tx_type: string;
  from_account: string;
  to_account: string;
  amount: number;
  description: string;
  category: string;
  tx_hash: string;
  created_at: string;
}

export interface Settlement {
  from: Member;
  to: Member;
  amount: number;
}
