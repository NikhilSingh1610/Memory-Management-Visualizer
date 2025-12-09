const functions = require('firebase-functions');

class Frame {
  constructor(frameNum) {
    this.frameNum = frameNum;
    this.free = true;
    this.pid = -1;
    this.page = -1;
  }
}

class PTE {
  constructor() {
    this.present = false;
    this.frameNum = -1;
  }
}

class Process {
  constructor(pid) {
    this.pid = pid;
    this.pageTable = Array(32).fill(null).map(() => new PTE());
  }
}

class FIFOReplacer {
  constructor() {
    this.queue = [];
  }

  push(frameNum) {
    this.queue.push(frameNum);
  }

  pop() {
    return this.queue.length > 0 ? this.queue.shift() : -1;
  }

  isEmpty() {
    return this.queue.length === 0;
  }
}

function simulateMemory(trace, frameCount) {
  const lines = trace.trim().split('\n');
  const frames = Array(frameCount).fill(null).map((_, i) => new Frame(i));
  const processes = {};
  const fifo = new FIFOReplacer();
  const steps = [];
  let hits = 0;
  let faults = 0;
  let stepIndex = 0;

  for (const line of lines) {
    const [pid, page] = line.split(' ').map(Number);
    
    if (!processes[pid]) {
      processes[pid] = new Process(pid);
    }

    const process = processes[pid];
    const pte = process.pageTable[page];

    let stepInfo = {
      step: stepIndex,
      pid,
      page,
      type: '',
      frames: frames.map(f => ({
        frameNum: f.frameNum,
        free: f.free,
        pid: f.pid,
        page: f.page
      })),
      hit: false,
      fault: false,
      evicted: null
    };

    if (pte.present) {
      hits++;
      stepInfo.hit = true;
      stepInfo.type = 'hit';
      stepInfo.result = `HIT: Page ${page} of Process ${pid} is in Frame ${pte.frameNum}`;
    } else {
      faults++;
      stepInfo.fault = true;
      stepInfo.type = 'fault';

      const freeFrame = frames.find(f => f.free);

      if (freeFrame) {
        freeFrame.free = false;
        freeFrame.pid = pid;
        freeFrame.page = page;
        pte.present = true;
        pte.frameNum = freeFrame.frameNum;
        fifo.push(freeFrame.frameNum);
        stepInfo.result = `FAULT: Page ${page} of Process ${pid} loaded into Frame ${freeFrame.frameNum}`;
      } else {
        const evictFrameNum = fifo.pop();
        const evictFrame = frames[evictFrameNum];
        const evictProcess = processes[evictFrame.pid];

        if (evictProcess) {
          evictProcess.pageTable[evictFrame.page].present = false;
        }

        stepInfo.evicted = {
          frameIndex: evictFrameNum,
          pid: evictFrame.pid,
          page: evictFrame.page
        };

        evictFrame.pid = pid;
        evictFrame.page = page;
        pte.present = true;
        pte.frameNum = evictFrameNum;
        fifo.push(evictFrameNum);
        stepInfo.result = `FAULT: Page ${page} of Process ${pid} evicted Page ${evictFrame.page} of Process ${evictFrame.pid} from Frame ${evictFrameNum}`;
      }
    }

    stepInfo.hitRate = ((hits / (stepIndex + 1)) * 100).toFixed(2);
    stepInfo.faultRate = ((faults / (stepIndex + 1)) * 100).toFixed(2);
    steps.push(stepInfo);
    stepIndex++;
  }

  const processData = Object.values(processes).map(p => ({
    pid: p.pid,
    pageTable: p.pageTable.map((pte, i) => ({
      page: i,
      present: pte.present,
      frameNum: pte.frameNum
    }))
  }));

  return {
    summary: {
      totalAccesses: lines.length,
      hits,
      faults,
      hitRate: ((hits / lines.length) * 100).toFixed(2),
      faultRate: ((faults / lines.length) * 100).toFixed(2)
    },
    steps,
    processes: processData
  };
}

// Cloud Function
exports.simulate = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { trace, frameCount } = req.body;

    if (!trace || !frameCount) {
      return res.status(400).json({ error: 'Missing trace or frameCount' });
    }

    const result = simulateMemory(trace, frameCount);
    res.json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
