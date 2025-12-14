import React, { useState, useEffect } from 'react';
import { calculateSVPWM } from './services/svpwmService';
import { InfoPanel } from './components/InfoPanel';
import { VectorPlot } from './components/VectorPlot';
import { WaveformChart } from './components/WaveformChart';
import { Play, Pause, RefreshCw, Cpu, FastForward, AlertTriangle, CheckSquare } from 'lucide-react';

const App: React.FC = () => {
  const [m, setM] = useState<number>(0.8);
  const [angleDeg, setAngleDeg] = useState<number>(30);
  const [showA, setShowA] = useState<boolean>(true);
  const [showB, setShowB] = useState<boolean>(true);
  const [showC, setShowC] = useState<boolean>(true);
  const [animationState, setAnimationState] = useState<'stopped' | 'continuous' | 'sweep'>('stopped');
  
  // Over-modulation safety states
  const [suppressWarning, setSuppressWarning] = useState<boolean>(false);
  const [showOverModWarning, setShowOverModWarning] = useState<boolean>(false);
  const [pendingM, setPendingM] = useState<number>(1.0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  // Constants
  const Ts = 1.0; 
  const angleRad = (angleDeg * Math.PI) / 180;
  const svpwmData = calculateSVPWM(m, angleRad, Ts);
  const isOverModulation = m > 1.0;

  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      if (animationState === 'continuous') {
        setAngleDeg(prev => (prev + 0.15) % 360);
        animationFrame = requestAnimationFrame(animate);
      } else if (animationState === 'sweep') {
        setAngleDeg(prev => {
          const next = prev + 1.0;
          if (next >= 360) {
             setAnimationState('stopped');
             return 360;
          }
          return next;
        });
        animationFrame = requestAnimationFrame(animate);
      }
    };
    if (animationState !== 'stopped') animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [animationState]);

  const handleSweep = () => { setAngleDeg(0); setAnimationState('sweep'); };

  const handleModulationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (val > 1.0 && m <= 1.0 && !suppressWarning) {
      setM(1.0); setPendingM(val); setDontShowAgain(false); setShowOverModWarning(true); 
    } else {
      setM(val);
    }
  };

  const confirmOverModulation = () => {
    if (dontShowAgain) setSuppressWarning(true);
    setM(pendingM); setShowOverModWarning(false);
  };

  // Fixed Light Theme Styles
  const bgMain = 'bg-slate-50 text-slate-900';
  const bgHeader = 'bg-white border-slate-200';
  const bgSidebar = 'bg-white';
  const cardBg = 'bg-white border-slate-200 shadow-sm';
  const buttonSecondary = 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50';
  const sliderTrack = 'bg-slate-300';

  return (
    <div className={`h-screen flex flex-col font-sans overflow-hidden relative ${bgMain}`}>
      
      {/* Warning Modal */}
      {showOverModWarning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className={`${cardBg} p-6 rounded-xl border border-red-500 shadow-2xl max-w-md w-full`}>
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle size={32} />
              <h2 className="text-xl font-bold">Over-Modulation Warning</h2>
            </div>
            <p className="mb-6 leading-relaxed text-sm opacity-90 text-slate-600">
              Increasing modulation index <strong>(m) above 1.0</strong> enters the non-linear region (Six-Step Mode), causing clipping and harmonic distortion.
            </p>
            <div className="flex items-center gap-2 mb-6 cursor-pointer hover:opacity-100 text-slate-600" onClick={() => setDontShowAgain(!dontShowAgain)}>
               <div className={`w-5 h-5 rounded border flex items-center justify-center ${dontShowAgain ? 'bg-red-600 border-red-500' : 'border-slate-400'}`}>
                  {dontShowAgain && <CheckSquare size={14} className="text-white" />}
               </div>
               <span className="text-sm select-none">Don't show again</span>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowOverModWarning(false); setM(1.0); }} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition-colors">Cancel</button>
              <button onClick={confirmOverModulation} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 font-bold shadow-lg shadow-red-500/20">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`flex-none px-6 py-3 border-b flex justify-between items-center shadow-sm z-10 ${bgHeader}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg shadow-sm bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
            <Cpu size={20} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800">3-Level SVPWM</h1>
            <p className="text-[10px] font-medium tracking-wide uppercase text-slate-500">Visual Engineering Tool</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
            onClick={() => { setAngleDeg(0); setM(0.8); setSuppressWarning(false); setAnimationState('stopped'); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${buttonSecondary}`}
          >
            <RefreshCw size={14} />
            <span className="text-xs font-medium">Reset</span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar - Compact Layout */}
        <aside className={`w-[350px] flex-none flex flex-col border-r-[4px] border-slate-200 overflow-hidden ${bgSidebar}`}>
          {/* Top: Vector Plot - Reduced height to ensure bottom controls fit on smaller screens */}
          <div className="flex-none h-[260px] flex items-center justify-center p-2 border-b border-slate-100 relative bg-slate-50">
             <VectorPlot m={m} angleRad={angleRad} />
          </div>

          {/* Bottom: Controls - Flex-1 to take remaining space, min-h-0 to allow flexbox shrinking */}
          <div className="flex-1 flex flex-col min-h-0 p-3 bg-white">
            
            {/* Control Buttons - Fixed at top of control section */}
            <div className="grid grid-cols-2 gap-3 flex-none mb-2">
              <button 
                onClick={() => setAnimationState(animationState === 'continuous' ? 'stopped' : 'continuous')}
                className={`flex justify-center items-center gap-2 px-3 py-2.5 rounded-lg font-bold shadow-sm transition-all text-sm ${
                  animationState === 'continuous' ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                 {animationState === 'continuous' ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                 {animationState === 'continuous' ? 'Stop' : 'Rotate'}
              </button>
              
              <button 
                onClick={handleSweep}
                disabled={animationState === 'sweep'}
                className="flex justify-center items-center gap-2 px-3 py-2.5 rounded-lg font-bold shadow-sm transition-all disabled:opacity-50 bg-slate-700 text-white hover:bg-slate-800 text-sm"
              >
                <FastForward size={16} /> Sweep
              </button>
            </div>

            {/* Sliders Container - Takes available space and centers content evenly */}
            <div className="flex-1 flex flex-col justify-evenly gap-2 py-1">
              {/* Modulation Slider */}
              <div className={`p-2.5 rounded-xl border transition-colors duration-300 ${isOverModulation ? 'border-red-500 bg-red-50' : cardBg}`}>
                <div className="flex justify-between mb-1">
                  <label className={`text-xs font-semibold ${isOverModulation ? 'text-red-600' : 'text-slate-700'}`}>Modulation (m)</label>
                  <span className={`font-mono px-1.5 rounded text-xs font-bold ${isOverModulation ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-800'}`}>{m.toFixed(2)}</span>
                </div>
                <div className="relative mb-4">
                  <input 
                    type="range" min="0" max="1.15" step="0.01" value={m} onChange={handleModulationChange}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${sliderTrack} ${isOverModulation ? 'accent-red-500' : 'accent-indigo-500'}`}
                  />
                  <div className="relative w-full h-3 mt-1 font-mono text-[9px] text-slate-500">
                    <span className="absolute left-0">0.0</span>
                    <div className="absolute top-0 flex flex-col items-center" style={{ left: 'calc(86.9565% - 7px)' }}>
                       <div className={`h-1 w-px mb-0.5 ${isOverModulation ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                       <span className={`font-bold -translate-x-1/2 ${isOverModulation ? 'text-red-500' : 'text-indigo-600'}`}>1.0</span>
                    </div>
                    <span className="absolute right-0">1.15</span>
                  </div>
                </div>
              </div>

              {/* Angle Slider */}
              <div className={`p-2.5 rounded-xl border ${cardBg}`}>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Angle (θ)</label>
                  <span className="font-mono px-1.5 rounded bg-slate-100 text-slate-800 text-xs">{angleDeg.toFixed(1)}°</span>
                </div>
                <input 
                  type="range" min="0" max="360" step="1" value={angleDeg}
                  onChange={(e) => { setAngleDeg(parseFloat(e.target.value)); setAnimationState('stopped'); }}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${sliderTrack} accent-emerald-500`}
                />
              </div>
            </div>

            {/* Channels - Fixed at bottom of control panel */}
             <div className="flex-none pt-2 border-t border-slate-100 mt-1">
                <div className="flex gap-2">
                  {[{l:'A',s:showA,f:setShowA, c: 'text-red-600 border-red-200 bg-red-50'},{l:'B',s:showB,f:setShowB, c: 'text-green-600 border-green-200 bg-green-50'},{l:'C',s:showC,f:setShowC, c: 'text-blue-600 border-blue-200 bg-blue-50'}].map((c) => (
                    <button 
                      key={c.l} 
                      onClick={() => c.f(!c.s)} 
                      className={`flex-1 py-2 rounded-md border text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1
                        ${c.s ? `${c.c} ring-1 ring-inset ring-opacity-50` : 'bg-slate-50 text-slate-400 border-slate-200 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'}`}
                    >
                       <span className={`w-2 h-2 rounded-full ${c.s ? 'bg-current' : 'bg-slate-300'}`}></span>
                       Ph {c.l}
                    </button>
                  ))}
                </div>
              </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto bg-slate-100">
          <section className="flex-1 min-h-[300px] shadow-sm">
             <WaveformChart sequence={svpwmData.sequence} showA={showA} showB={showB} showC={showC} />
          </section>
          <section className="flex-none h-[220px]">
             <InfoPanel data={svpwmData} angleDeg={angleDeg} />
          </section>
        </div>
      </main>
    </div>
  );
};

export default App;