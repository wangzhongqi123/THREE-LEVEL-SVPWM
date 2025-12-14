import React, { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from 'recharts';
import { SevenSegmentSequence, SwitchState } from '../types';
import { AlertTriangle } from 'lucide-react';

interface WaveformChartProps {
  sequence: SevenSegmentSequence;
  showA: boolean; showB: boolean; showC: boolean;
}

const mapStateToValue = (state: SwitchState): number => {
  if (state === SwitchState.P) return 1;
  if (state === SwitchState.O) return 0;
  return -1;
};

const mapValueToLabel = (val: number) => val === 1 ? 'P' : (val === 0 ? 'O' : 'N');

export const WaveformChart: React.FC<WaveformChartProps> = ({ sequence, showA, showB, showC }) => {
  const hasTimingError = useMemo(() => sequence.times.some(t => t < -0.000001), [sequence]);

  const chartData = useMemo(() => {
    if (hasTimingError) return [];
    const data = [];
    let t = 0;
    for (let i = 0; i < 7; i++) {
      const dur = sequence.times[i];
      const end = t + dur;
      const pt = { A: mapStateToValue(sequence.statesA[i]), B: mapStateToValue(sequence.statesB[i]), C: mapStateToValue(sequence.statesC[i]) };
      
      data.push({ time: t, ...pt });
      // High res points for smooth hover
      for(let k = t + 0.005; k < end; k += 0.005) data.push({ time: k, ...pt });
      data.push({ time: end, ...pt });
      t = end;
    }
    return data;
  }, [sequence, hasTimingError]);

  // Fixed Light Theme Colors
  const bg = 'bg-white border-slate-300';
  const grid = '#e2e8f0';
  const axis = '#64748b';
  const lineA = '#ef4444';
  const lineB = '#22c55e';
  const lineC = '#3b82f6';

  if (hasTimingError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center rounded-xl border bg-red-50 border-red-200">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h4 className="text-xl font-bold text-red-500">Signal Error</h4>
        <p className="opacity-70 text-sm mt-2 text-red-700">Invalid timing sequence (Over-Modulation)</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col rounded-xl shadow-lg border overflow-hidden ${bg}`}>
      <div className="flex-1 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis dataKey="time" type="number" domain={[0, 1]} ticks={[0,0.5,1]} tickFormatter={t=>t.toFixed(1)} stroke={axis} tick={{fontSize:10}} />
            <YAxis 
              type="number" 
              domain={[-1.2, 1.2]} 
              ticks={[-1,0,1]} 
              tickFormatter={mapValueToLabel} 
              stroke={axis} 
              width={40} 
              tick={{fontSize:12, fontWeight: 'bold'}} 
              interval={0}
            />
            <Tooltip 
               contentStyle={{ backgroundColor: '#fff', borderColor: axis, color: axis }} 
               formatter={(val:number)=>mapValueToLabel(val)} labelFormatter={l=>`t=${l.toFixed(3)}`}
            />
            <Legend wrapperStyle={{ fontSize: '12px', color: axis }} iconSize={8} />
            <ReferenceLine x={0.5} stroke="#fbbf24" strokeDasharray="3 3" opacity={0.5} />
            {showA && <Line type="monotoneX" dataKey="A" stroke={lineA} strokeWidth={2} dot={false} isAnimationActive={false} name="Ph A" />}
            {showB && <Line type="monotoneX" dataKey="B" stroke={lineB} strokeWidth={2} dot={false} isAnimationActive={false} name="Ph B" />}
            {showC && <Line type="monotoneX" dataKey="C" stroke={lineC} strokeWidth={2} dot={false} isAnimationActive={false} name="Ph C" />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};