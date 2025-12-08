import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { simulateMemory } from './simulator.js';

const app = express();
const PORT = 3001;


app.use(cors());
app.use(bodyParser.json());

app.post('/api/simulate', (req, res) => {
  try {
    const { trace, frameCount = 4 } = req.body;

    if (!Array.isArray(trace) || trace.length === 0) {
      return res.status(400).json({ error: 'Invalid trace data' });
    }

    const result = simulateMemory(trace, frameCount);
    res.json(result);
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ error: 'Simulation failed' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Memory Visualizer Backend running on http://localhost:${PORT}`);
});
