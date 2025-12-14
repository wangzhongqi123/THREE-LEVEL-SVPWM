import React from 'react';
import { SVPWMCalculationResult } from '../types';
import { Activity, Clock } from 'lucide-react';

interface InfoPanelProps {
  data: SVPWMCalculationResult;
  angleDeg: number;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ data, angleDeg }) => {
  const percent = (t: number) => Math.min(Math.abs(t) * 100, 100);

  // Fixed Light Theme Colors
  const cardClass = 'bg-white border-slate-300';
  const labelColor = 'text-slate-500';
  const valueColor = 'text-slate-900';
  const barBg = 'bg-slate-200';
  const innerCard = 'bg-slate-50 border-slate-200';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full font-sans text-sm">
      {/* Parameters */}
      <div className={`${cardClass} p-5 rounded-xl border flex flex-col shadow-sm`}>
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
           <Activity size={18} className="text-indigo-500" />
           <h4 className={`font-bold uppercase tracking-wider ${valueColor}`}>Operating Point</h4>
        </div>
        
        <div className="grid grid-cols-3 gap-3 flex-1 content-center">
           {/* Major Sector */}
           <div className={`p-3 rounded border ${innerCard}`}>
              <span className={`text-[10px] uppercase font-bold ${labelColor}`}>Major Sector</span>
              <div className={`text-xl font-mono font-bold mt-1 ${valueColor}`}>
                {data.majorSector}
              </div>
           </div>

           {/* Minor Sector */}
           <div className={`p-3 rounded border ${innerCard}`}>
              <span className={`text-[10px] uppercase font-bold ${labelColor}`}>Minor Sector</span>
              <div className={`text-xl font-mono font-bold mt-1 ${valueColor}`}>
                {data.minorSector}
              </div>
           </div>

           {/* V_REF */}
           <div className={`p-3 rounded border ${innerCard}`}>
              <span className={`text-[10px] uppercase font-bold ${labelColor}`}>V_REF</span>
              <div className={`text-xl font-mono font-bold mt-1 ${valueColor}`}>{data.vref.toFixed(3)}</div>
           </div>

           {/* Bottom Row */}
           <div className="col-span-3 grid grid-cols-3 gap-2 text-center">
              {['Theta', 'V_alpha', 'V_beta'].map((l, i) => (
                <div key={l} className={`p-2 rounded border ${innerCard}`}>
                   <span className={`block text-[10px] uppercase ${labelColor}`}>{l}</span>
                   <span className={`font-mono ${valueColor}`}>{i===0 ? angleDeg.toFixed(1)+'°' : (i===1 ? data.valpha.toFixed(2) : data.vbeta.toFixed(2))}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Timing */}
      <div className={`${cardClass} p-5 rounded-xl border flex flex-col shadow-sm`}>
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
           <Clock size={18} className="text-emerald-500" />
           <h4 className={`font-bold uppercase tracking-wider ${valueColor}`}>Time Calculations</h4>
        </div>

        <div className="space-y-4 flex-1 content-center">
           {[
             { l: 'Ta', v: data.Ta, c: 'bg-emerald-500' },
             { l: 'Tb', v: data.Tb, c: 'bg-teal-500' },
             { l: 'Tc', v: data.Tc, c: 'bg-cyan-500' }
           ].map((item) => (
             <div key={item.l}>
               <div className={`flex justify-between text-xs font-mono mb-1 ${labelColor}`}>
                 <span>{item.l}</span>
                 <span>{Math.abs(item.v).toFixed(4)}</span>
               </div>
               <div className={`relative h-3 rounded-sm overflow-hidden border border-slate-200 ${barBg}`}>
                  <div className={`h-full ${item.c}`} style={{ width: `${percent(item.v)}%` }}></div>
               </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};