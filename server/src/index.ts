import express from 'express';
import cors from 'cors';
import { router } from './routes/pools.js';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Mount all routes under /api
app.use('/api', router);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'splitpool', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n  SplitPool server running on http://localhost:${PORT}`);
  console.log(`  API base: http://localhost:${PORT}/api`);
  console.log(`  Health:   http://localhost:${PORT}/health\n`);
});
