import { useState } from 'react'
import './App.css'

interface TraceEntry {
  pid: number
  page: number
}

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
  const [trace, setTrace] = useState<TraceEntry[]>([])
  const [frameCount, setFrameCount] = useState(4)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState('')

  const handleTraceUpload = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    try {
      const entries = text
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [pid, page] = line.trim().split(/\s+/).map(Number)
          return { pid, page }
        })
      setTrace(entries)
      setError('')
    } catch (err) {
      setError('Invalid trace format. Expected: pid page (one per line)')
    }
  }

  const runSimulation = async () => {
    if (trace.length === 0) {
      setError('Please enter a trace first')
      return
    }

    setLoading(true)
    setError('')
    setCurrentStep(0)

    try {
      const response = await fetch('http://localhost:3001/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trace, frameCount })
      })

      if (!response.ok) {
        throw new Error('Simulation failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError('Failed to run simulation. Make sure backend is running on port 3001')
    } finally {
      setLoading(false)
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
                  type="range"
                  min="1"
                  max="16"
                  value={frameCount}
                  onChange={(e) => setFrameCount(Number(e.target.value))}
                  className="slider"
                />
                <span className="frame-count-display">{frameCount}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Memory Access Trace</label>
              <p className="hint">Enter process ID and page number (one per line)</p>
              <textarea
                rows={12}
                placeholder="1 0&#10;1 1&#10;2 0&#10;1 2&#10;3 0"
                value={trace.map(t => `${t.pid} ${t.page}`).join('\n')}
                onChange={handleTraceUpload}
                className="trace-input"
              />
              <div className="trace-stats">
                <span>{trace.length} memory accesses</span>
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
                    style={{ width: `${result.summary.hitRate}%` }}
                  >
                    {result.summary.hitRate > 10 && `${result.summary.hitRate}%`}
                  </div>
                  <div 
                    className="progress-fill faults" 
                    style={{ width: `${result.summary.faultRate}%` }}
                  >
                    {result.summary.faultRate > 10 && `${result.summary.faultRate}%`}
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
                      {result.steps[currentStep].frames.map((frame, i) => (
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
                      ))}
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
