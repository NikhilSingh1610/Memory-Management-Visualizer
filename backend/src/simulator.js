

class Frame {
  constructor() {
    this.free = true;
    this.pid = -1;
    this.page = -1;
  }
}

class PTE {
  constructor() {
    this.present = false;
    this.frame = -1;
  }
}

class Process {
  constructor(pid, pageCount = 32) {
    this.pid = pid;
    this.pageTable = Array.from({ length: pageCount }, () => new PTE());
  }
}

class FIFOReplacer {
  constructor() {
    this.queue = [];
  }

  push(frameIndex) {
    this.queue.push(frameIndex);
  }

  evict() {
    if (this.queue.length === 0) return -1;
    return this.queue.shift();
  }
}

export function simulateMemory(trace, frameCount = 4) {
  const frames = Array.from({ length: frameCount }, () => new Frame());
  const processes = new Map();
  const fifo = new FIFOReplacer();
  
  let hits = 0;
  let faults = 0;
  const steps = [];
  
  for (let stepNum = 0; stepNum < trace.length; stepNum++) {
    const { pid, page } = trace[stepNum];
    
    // Initialize process if not exists
    if (!processes.has(pid)) {
      processes.set(pid, new Process(pid));
    }
    
    const process = processes.get(pid);
    const stepData = {
      step: stepNum,
      pid,
      page,
      type: 'miss',
      evicted: null,
      frames: JSON.parse(JSON.stringify(frames)),
      hitRate: 0,
      faultRate: 0
    };
    
    // Check for HIT
    if (process.pageTable[page].present) {
      hits++;
      stepData.type = 'hit';
      stepData.frame = process.pageTable[page].frame;
    } else {
      // PAGE FAULT
      faults++;
      stepData.type = 'fault';
      
      // Find free frame
      let foundFree = false;
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].free) {
          frames[i].free = false;
          frames[i].pid = pid;
          frames[i].page = page;
          
          process.pageTable[page].present = true;
          process.pageTable[page].frame = i;
          
          fifo.push(i);
          stepData.frame = i;
          foundFree = true;
          break;
        }
      }
      
      // No free frame - need to evict
      if (!foundFree) {
        const victim = fifo.evict();
        const oldPid = frames[victim].pid;
        const oldPage = frames[victim].page;
        
        stepData.evicted = {
          frameIndex: victim,
          pid: oldPid,
          page: oldPage
        };
        
        processes.get(oldPid).pageTable[oldPage].present = false;
        
        frames[victim].pid = pid;
        frames[victim].page = page;
        
        process.pageTable[page].present = true;
        process.pageTable[page].frame = victim;
        
        fifo.push(victim);
        stepData.frame = victim;
      }
    }
    
    // Calculate rates
    const totalAccesses = hits + faults;
    stepData.hitRate = totalAccesses > 0 ? ((hits / totalAccesses) * 100).toFixed(2) : 0;
    stepData.faultRate = totalAccesses > 0 ? ((faults / totalAccesses) * 100).toFixed(2) : 0;
    stepData.frames = JSON.parse(JSON.stringify(frames));
    
    steps.push(stepData);
  }
  
  return {
    summary: {
      totalAccesses: hits + faults,
      hits,
      faults,
      hitRate: ((hits / (hits + faults)) * 100).toFixed(2),
      faultRate: ((faults / (hits + faults)) * 100).toFixed(2)
    },
    steps,
    processes: Array.from(processes.values()).map(p => ({
      pid: p.pid,
      pageTable: p.pageTable
    }))
  };
}
