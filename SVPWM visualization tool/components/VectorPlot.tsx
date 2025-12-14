import React from 'react';

interface VectorPlotProps {
  m: number;      
  angleRad: number; 
}

export const VectorPlot: React.FC<VectorPlotProps> = ({ m, angleRad }) => {
  const size = 300; 
  const center = size / 2;
  const scale = 110; 

  const isOverModulation = m > 1.0;
  
  // Fixed Light Theme Colors
  const axisColor = '#94a3b8';
  const hexStroke = '#64748b';
  const hexFill = '#f8fafc';
  const textColor = '#475569';
  const vectorColor = isOverModulation ? '#ef4444' : '#eab308';
  const tipColor = vectorColor;
  
  const limitCircleColor = isOverModulation ? '#f87171' : axisColor;

  // Hexagon Calculation
  // Hexagon vertex radius = 2/sqrt(3) approx 1.1547 units.
  const hexRadius = 1.1547 * scale;
  
  const getXY = (r: number, theta: number) => ({
    x: center + r * Math.cos(theta),
    y: center - r * Math.sin(theta)
  });

  const hexPoints = [];
  for (let i = 0; i < 6; i++) {
    const theta = i * (Math.PI / 3); 
    const { x, y } = getXY(hexRadius, theta);
    hexPoints.push(`${x},${y}`);
  }

  // Vector Tip
  const { x: tipX, y: tipY } = getXY(m * scale, angleRad);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full rounded-xl">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet" className="overflow-visible">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={tipColor} />
          </marker>
        </defs>

        {/* Axes */}
        <line x1={center} y1={0} x2={center} y2={size} stroke={axisColor} strokeWidth="1" />
        <line x1={0} y1={center} x2={size} y2={center} stroke={axisColor} strokeWidth="1" />

        {/* Hexagon */}
        <polygon points={hexPoints.join(' ')} fill={hexFill} stroke={hexStroke} strokeWidth="1.5" />

        {/* Inscribed Circle (Linear Limit m=1) */}
        <circle cx={center} cy={center} r={1.0 * scale} fill="none" stroke={limitCircleColor} strokeWidth="1" strokeDasharray="4 2" />
        
        {/* Label for Hexagon Vertex (2/3) */}
        <text x={center + hexRadius + 4} y={center + 3} fill={textColor} fontSize="10" fontWeight="bold" className="font-mono">
           2/3
        </text>
        <line x1={center + hexRadius} y1={center-3} x2={center + hexRadius} y2={center+3} stroke={textColor} strokeWidth={1} />

        {/* Sectors */}
        {[0, 1, 2, 3, 4, 5].map(i => {
           const theta = i * (Math.PI / 3);
           const p = getXY(hexRadius, theta);
           // Moved Sector Labels OUTSIDE the hexagon (1.15x radius)
           const tP = getXY(hexRadius * 1.15, theta + Math.PI/6); 
           return (
             <React.Fragment key={i}>
                <line x1={center} y1={center} x2={p.x} y2={p.y} stroke={axisColor} strokeWidth="1" opacity="0.5" />
                <text x={tP.x} y={tP.y} fill={textColor} fontSize="12" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">
                  {['I', 'II', 'III', 'IV', 'V', 'VI'][i]}
                </text>
             </React.Fragment>
           );
        })}

        {/* Vector */}
        <line 
          x1={center} y1={center} x2={tipX} y2={tipY} 
          stroke={vectorColor} strokeWidth="3" markerEnd="url(#arrowhead)" 
          className="transition-all duration-75 ease-linear"
        />
        <circle cx={center} cy={center} r="3" fill={vectorColor} />
      </svg>
      
      <div className={`mt-2 text-[10px] font-mono px-2 py-0.5 rounded-full border opacity-80 ${isOverModulation ? 'text-red-500 border-red-500' : 'text-slate-600 border-slate-400'} transition-colors`}>
         m={m.toFixed(2)} @ {(angleRad * 180 / Math.PI).toFixed(1)}°
      </div>
    </div>
  );
};