import { useState } from 'react'
import './App.css'

interface SimulationResult {
  summary: {
    totalAccesses: number
    hits: number
    faults: number
    hitRate: string
    faultRate: string
  }
  steps: Array<{
    step: number
    pid: number
    page: number
    type: 'hit' | 'fault' | 'miss'
    frame: number
    evicted: { frameIndex: number; pid: number; page: number } | null
    frames: Array<{ free: boolean; pid: number; page: number }>
    hitRate: string
    faultRate: string
  }>
}

function App() {
  const [traceText, setTraceText] = useState('')
  const [frameCount, setFrameCount] = useState(4)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState('')

  const handleTraceUpload = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setTraceText(text)
    setError('')
  }

  const runSimulation = async () => {
    if (traceText.trim().length === 0) {
      setError('Please enter a trace first')
      return
    }

    setLoading(true)
    setError('')
    setCurrentStep(0)

    try {
      // Call Cloud Function via HTTPS
      const response = await fetch('https://us-central1-oslab-00.cloudfunctions.net/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          trace: traceText, 
          frameCount 
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data as SimulationResult)
      setLoading(false)
      return
    } catch (cloudErr: any) {
      console.warn('Cloud Function failed, falling back to client simulation:', cloudErr?.message || cloudErr)
    }

    try {
      const result = simulateMemory(traceText, frameCount)
      setResult(result)
    } catch (err: any) {
      setError('Failed to run simulation: ' + (err.message || 'Unknown error'))
      console.error('Simulation error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Client-side simulation logic
  const simulateMemory = (trace: string, frameCount: number) => {
    const lines = trace.trim().split('\n').filter(l => l.trim())
    const frames: any[] = Array(frameCount).fill(null).map((_, i) => ({
      frameNum: i,
      free: true,
      pid: -1,
      page: -1
    }))
    const processes: any = {}
    const fifoQueue: number[] = []
    const steps: any[] = []
    let hits = 0
    let faults = 0

    lines.forEach((line, idx) => {
      const [pid, page] = line.split(/\s+/).map(Number)
      
      if (!processes[pid]) {
        processes[pid] = {
          pid,
          pageTable: []
        }
        // Initialize page table with 32 entries
        for (let i = 0; i < 32; i++) {
          processes[pid].pageTable[i] = { present: false, frameNum: -1 }
        }
      }

      const process = processes[pid]
      const pte = process.pageTable[page]

      if (!pte) {
        console.error('Invalid page number:', page)
        return
      }

      const stepInfo: any = {
        step: idx,
        pid,
        page,
        frameState: frames.map(f => ({ ...f })),
        hit: false,
        fault: false,
        evicted: null
      }

      if (pte.present) {
        hits++
        stepInfo.hit = true
        stepInfo.type = 'hit'
        stepInfo.frame = pte.frameNum
        stepInfo.result = `HIT: Page ${page} of Process ${pid} is in Frame ${pte.frameNum}`
      } else {
        faults++
        stepInfo.fault = true
        stepInfo.type = 'fault'

        const freeFrame = frames.find(f => f.free)

        if (freeFrame) {
          freeFrame.free = false
          freeFrame.pid = pid
          freeFrame.page = page
          pte.present = true
          pte.frameNum = freeFrame.frameNum
          fifoQueue.push(freeFrame.frameNum)
          stepInfo.frame = freeFrame.frameNum
          stepInfo.result = `FAULT: Page ${page} of Process ${pid} loaded into Frame ${freeFrame.frameNum}`
        } else {
          const evictFrameNum = fifoQueue.shift()!
          const evictFrame = frames[evictFrameNum]
          const evictProcess = processes[evictFrame.pid]

          if (evictProcess) {
            evictProcess.pageTable[evictFrame.page].present = false
          }

          stepInfo.evicted = {
            frameIndex: evictFrameNum,
            pid: evictFrame.pid,
            page: evictFrame.page
          }

          evictFrame.pid = pid
          evictFrame.page = page
          pte.present = true
          pte.frameNum = evictFrameNum
          fifoQueue.push(evictFrameNum)
          stepInfo.frame = evictFrameNum
          stepInfo.result = `FAULT: Page ${page} of Process ${pid} evicted Frame ${evictFrameNum} (P${evictFrame.pid}, Page ${evictFrame.page})`
        }
      }

      stepInfo.hitRate = ((hits / (idx + 1)) * 100).toFixed(2)
      stepInfo.faultRate = ((faults / (idx + 1)) * 100).toFixed(2)
      stepInfo.frames = frames.map(f => ({ ...f }))
      steps.push(stepInfo)
    })

    return {
      summary: {
        totalAccesses: lines.length,
        hits,
        faults,
        hitRate: ((hits / lines.length) * 100).toFixed(2),
        faultRate: ((faults / lines.length) * 100).toFixed(2)
      },
      steps
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>Memory Management Visualizer</h1>
          
        </div>
      </header>

      <div className="container">
        <div className="input-section">
          <div className="config-card">
            <h2>Configuration</h2>
            
            <div className="form-group">
              <label>Number of Physical Frames</label>
              <div className="input-with-label">
                <input
                  type="number"
                  min="1"
                  max="32"
                  value={frameCount}
                  onChange={(e) => setFrameCount(Number(e.target.value))}
                  className="frame-count-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Memory Access Trace</label>
              <p className="hint">Enter process ID and page number (one per line)</p>
              <textarea
                rows={12}
                placeholder="1 0&#10;1 1&#10;2 0&#10;1 2&#10;3 0"
                value={traceText}
                onChange={handleTraceUpload}
                className="trace-input"
              />
              <div className="trace-stats">
                <span>{traceText.split('\n').filter(l => l.trim()).length} memory accesses</span>
              </div>
            </div>

            <button onClick={runSimulation} disabled={loading} className={`simulate-btn ${loading ? 'loading' : ''}`}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Simulating...
                </>
              ) : (
                <>
                  Run Simulation
                </>
              )}
            </button>

            {error && <div className="error-banner">{error}</div>}
          </div>
        </div>

        {result && (
          <div className="results-section">
            <div className="summary-card">
              <h2>Simulation Summary</h2>
              <div className="stats-grid">
                <div className="stat-card total">
                  <div className="stat-number">{result.summary.totalAccesses}</div>
                  <div className="stat-label">Total Accesses</div>
                </div>
                <div className="stat-card hits">
                  <div className="stat-number">{result.summary.hits}</div>
                  <div className="stat-label">Hits</div>
                </div>
                <div className="stat-card faults">
                  <div className="stat-number">{result.summary.faults}</div>
                  <div className="stat-label">Faults</div>
                </div>
                <div className="stat-card rate-hit">
                  <div className="stat-number">{result.summary.hitRate}%</div>
                  <div className="stat-label">Hit Rate</div>
                </div>
                <div className="stat-card rate-fault">
                  <div className="stat-number">{result.summary.faultRate}%</div>
                  <div className="stat-label">Fault Rate</div>
                </div>
              </div>

              <div className="progress-bar-container">
                <div className="progress-label">Hit vs Fault Distribution</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill hits" 
                    style={{ width: `${parseFloat(result.summary.hitRate)}%` }}
                  >
                    {parseFloat(result.summary.hitRate) > 10 && `${result.summary.hitRate}%`}
                  </div>
                  <div 
                    className="progress-fill faults" 
                    style={{ width: `${parseFloat(result.summary.faultRate)}%` }}
                  >
                    {parseFloat(result.summary.faultRate) > 10 && `${result.summary.faultRate}%`}
                  </div>
                </div>
              </div>
            </div>

            <div className="simulation-card">
              <h2>Step-by-Step Simulation</h2>
              
              <div className="step-controls">
                <button
                  onClick={() => setCurrentStep(0)}
                  disabled={currentStep === 0}
                  className="control-btn first"
                  title="Go to first step"
                >
                  |&lt;
                </button>
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="control-btn prev"
                  title="Previous step"
                >
                  &lt;
                </button>
                <div className="step-indicator">
                  <span className="current-step">{currentStep + 1}</span>
                  <span className="total-steps">/ {result.steps.length}</span>
                </div>
                <button
                  onClick={() => setCurrentStep(Math.min(result.steps.length - 1, currentStep + 1))}
                  disabled={currentStep === result.steps.length - 1}
                  className="control-btn next"
                  title="Next step"
                >
                  &gt;
                </button>
                <button
                  onClick={() => setCurrentStep(result.steps.length - 1)}
                  disabled={currentStep === result.steps.length - 1}
                  className="control-btn last"
                  title="Go to last step"
                >
                  &gt;|
                </button>
              </div>

              <div className="progress-slider-container">
                <input
                  type="range"
                  min="0"
                  max={result.steps.length - 1}
                  value={currentStep}
                  onChange={(e) => setCurrentStep(Number(e.target.value))}
                  className="progress-slider"
                />
              </div>

              {result.steps[currentStep] && (
                <div className="step-detail">
                  <div className="access-info">
                    <div className="access-card">
                      <span className="label">Process</span>
                      <span className="value pid">{result.steps[currentStep].pid}</span>
                    </div>
                    <div className="access-card">
                      <span className="label">Page</span>
                      <span className="value page">{result.steps[currentStep].page}</span>
                    </div>
                    <div className={`access-card type ${result.steps[currentStep].type}`}>
                      <span className="label">Result</span>
                      <span className="value">
                        {result.steps[currentStep].type === 'hit' ? 'HIT' : 'FAULT'}
                      </span>
                    </div>
                    {result.steps[currentStep].evicted && (
                      <div className="access-card evicted">
                        <span className="label">Evicted</span>
                        <span className="value">P{result.steps[currentStep].evicted?.pid} pg{result.steps[currentStep].evicted?.page}</span>
                      </div>
                    )}
                  </div>

                  <div className="frames-container">
                    <h3>Physical Memory Frames</h3>
                    <div className="frames-grid">
                      {result.steps[currentStep].frames && result.steps[currentStep].frames.length > 0 ? (
                        result.steps[currentStep].frames.map((frame, i) => (
                          <div
                            key={i}
                            className={`frame-box ${frame.free ? 'free' : 'occupied'} ${
                              frame.pid === result.steps[currentStep].pid && !frame.free ? 'current-access' : ''
                            }`}
                          >
                            <div className="frame-number">Frame {i}</div>
                            {!frame.free ? (
                              <div className="frame-content">
                                <div className="frame-pid">P{frame.pid}</div>
                                <div className="frame-page">Pg{frame.page}</div>
                              </div>
                            ) : (
                              <div className="frame-empty">Empty</div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="error-banner">No frame data available</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
