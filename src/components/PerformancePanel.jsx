import { useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { BarChart2 } from 'lucide-react';
import { GaugeCard, SectionHeader } from './ui/SharedComponents';
import { useInView } from '../hooks/useAnimations';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111827] border border-[#2a3f5f] rounded-xl p-3 shadow-2xl">
      <p className="text-xs text-[#8b9ab5] mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#8b9ab5] capitalize">{p.name}:</span>
          <span className="text-[#f0f6ff] font-semibold metric-value">
            {p.dataKey === 'latency' ? `${p.value}ms` : `${(p.value * 100).toFixed(1)}%`}
          </span>
        </div>
      ))}
    </div>
  );
};

const LatencyTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111827] border border-[#2a3f5f] rounded-xl p-3 shadow-2xl">
      <p className="text-xs text-[#8b9ab5] mb-1">{label}</p>
      <p className="text-sm font-bold text-amber-400 metric-value">{payload[0].value}ms</p>
    </div>
  );
};

export function PerformancePanel({ timeline, kpis }) {
  const [activeTab, setActiveTab] = useState('quality');
  const [ref, inView] = useInView(0.05);

  return (
    <section className="glass-card rounded-2xl p-5" aria-label="Model Performance Metrics" ref={ref}>
      <SectionHeader icon={<BarChart2 size={16} />} title="Model Performance Trends">
        <div className="flex rounded-lg overflow-hidden border border-[#1e2d45]">
          {[['quality', 'Quality Metrics'], ['latency', 'Latency']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setActiveTab(val)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === val ? 'bg-blue-500/20 text-blue-300' : 'text-[#8b9ab5] hover:text-[#f0f6ff] hover:bg-[#1e2d45]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </SectionHeader>

      {/* Current scores as gauges */}
      <div className="flex items-center justify-around mb-6 py-3 bg-[#080c14] rounded-xl border border-[#1e2d45] flex-wrap gap-4">
        <GaugeCard label="Faithfulness" value={kpis.faithfulness_score} color="#10b981" />
        <GaugeCard label="Satisfaction" value={kpis.satisfaction_rate} color="#3b82f6" />
        <GaugeCard label="Ans. Relevancy" value={0.89} color="#8b5cf6" />
        <GaugeCard label="Ctx. Precision" value={0.84} color="#06b6d4" />
      </div>

      {/* Trend chart */}
      <div
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s',
        }}
      >
        {activeTab === 'quality' ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="faithGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="relGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="satGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
              <XAxis dataKey="time" tick={{ fill: '#4b5c78', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0.7, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fill: '#4b5c78', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#8b9ab5' }} />
              <Area type="monotone" dataKey="faithfulness" name="Faithfulness" stroke="#10b981" strokeWidth={2} fill="url(#faithGrad)" dot={false} activeDot={{ r: 4, fill: '#10b981' }} />
              <Area type="monotone" dataKey="relevancy" name="Relevancy" stroke="#3b82f6" strokeWidth={2} fill="url(#relGrad)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
              <Area type="monotone" dataKey="satisfaction" name="Satisfaction" stroke="#8b5cf6" strokeWidth={2} fill="url(#satGrad)" dot={false} activeDot={{ r: 4, fill: '#8b5cf6' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
              <XAxis dataKey="time" tick={{ fill: '#4b5c78', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[700, 1600]} tickFormatter={v => `${v}ms`} tick={{ fill: '#4b5c78', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<LatencyTooltip />} />
              <Area type="monotone" dataKey="latency" name="Latency" stroke="#f59e0b" strokeWidth={2} fill="url(#latGrad)" dot={false} activeDot={{ r: 4, fill: '#f59e0b' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
