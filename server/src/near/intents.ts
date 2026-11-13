const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function generateTxHash(): string {
  let hash = '';
  for (let i = 0; i < 44; i++) {
    hash += BASE58_CHARS[Math.floor(Math.random() * BASE58_CHARS.length)];
  }
  return hash;
}

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const NEAR_PRICE_USD = 6.50;

export async function simulateDeposit(
  fromAccount: string,
  amount: number,
  token: string
): Promise<{
  txHash: string;
  amountUSDC: number;
  fee: number;
  simulated: true;
  swapped: boolean;
  originalToken?: string;
  originalAmount?: number;
}> {
  await randomDelay(800, 1500);

  const txHash = generateTxHash();
  const isSwap = token.toUpperCase() !== 'USDC';

  let amountUSDC: number;
  let fee: number;

  if (isSwap) {
    // Simulate swap — NEAR to USDC at ~$6.50/NEAR with 0.3% slippage
    const rawUSDC = amount * NEAR_PRICE_USD;
    fee = parseFloat((rawUSDC * 0.003).toFixed(2));
    amountUSDC = parseFloat((rawUSDC - fee).toFixed(2));
  } else {
    fee = parseFloat((amount * 0.001).toFixed(2));
    amountUSDC = parseFloat((amount - fee).toFixed(2));
  }

  return {
    txHash,
    amountUSDC,
    fee,
    simulated: true,
    swapped: isSwap,
    ...(isSwap && { originalToken: token, originalAmount: amount }),
  };
}

export async function simulateTransfer(
  fromPool: string,
  toAccount: string,
  amount: number
): Promise<{
  txHash: string;
  amount: number;
  fee: number;
  simulated: true;
}> {
  await randomDelay(800, 1500);

  const txHash = generateTxHash();
  const fee = parseFloat((amount * 0.001).toFixed(2));

  return {
    txHash,
    amount: parseFloat((amount - fee).toFixed(2)),
    fee,
    simulated: true,
  };
}
