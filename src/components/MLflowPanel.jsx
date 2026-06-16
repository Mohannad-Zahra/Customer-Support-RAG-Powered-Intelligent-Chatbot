import { useState } from 'react';
import { FlaskConical, ChevronDown, ChevronRight } from 'lucide-react';
import { SectionHeader, StatusBadge, MetricPill } from './ui/SharedComponents';
import { formatDateTime } from '../hooks/useAnimations';

function ExperimentRow({ exp, isSelected, onSelect }) {
  const isRunning = exp.status === 'running';
  const metrics = exp.metrics;

  return (
    <div
      className={`rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
        isSelected
          ? 'border-blue-500/40 bg-blue-500/5'
          : 'border-[#1e2d45] bg-[#0d1117] hover:border-[#2a3f5f] hover:bg-[#111827]'
      }`}
      onClick={onSelect}
    >
      {/* Header row */}
      <div className="flex items-center justify-between p-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[#4b5c78] shrink-0">
            {isSelected ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f0f6ff] truncate font-mono">{exp.name}</p>
            <p className="text-xs text-[#4b5c78] mt-0.5">{formatDateTime(exp.timestamp)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {metrics.faithfulness && (
            <span className="text-sm font-bold text-emerald-400 metric-value hidden sm:block">
              {(metrics.faithfulness * 100).toFixed(0)}% <span className="text-[10px] font-normal text-[#4b5c78]">faith.</span>
            </span>
          )}
          <StatusBadge status={exp.status} />
        </div>
      </div>

      {/* Expanded details */}
      <div
        className={`transition-all duration-400 overflow-hidden`}
        style={{ maxHeight: isSelected ? '240px' : '0px', opacity: isSelected ? 1 : 0 }}
      >
        <div className="border-t border-[#1e2d45] px-4 pb-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Parameters */}
            <div>
              <p className="text-[10px] text-[#4b5c78] uppercase tracking-widest font-semibold mb-2">Parameters</p>
              <div className="space-y-1.5">
                {Object.entries(exp.params).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-xs text-[#8b9ab5]">{k}</span>
                    <code className="text-xs text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">{String(v)}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div>
              <p className="text-[10px] text-[#4b5c78] uppercase tracking-widest font-semibold mb-2">Metrics</p>
              {isRunning ? (
                <div className="flex items-center gap-2 mt-4">
                  <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-xs text-[#8b9ab5]">Evaluation in progress…</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {[
                    { k: 'Faithfulness', v: metrics.faithfulness },
                    { k: 'Ans. Relevancy', v: metrics.answer_relevancy },
                    { k: 'Ctx. Precision', v: metrics.context_precision },
                  ].map(({ k, v }) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-xs text-[#8b9ab5]">{k}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[#1e2d45] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                            style={{ width: `${v * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-emerald-400 metric-value w-8 text-right">
                          {(v * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1 border-t border-[#1e2d45]">
                    <span className="text-xs text-[#8b9ab5]">Latency</span>
                    <span className="text-xs font-bold text-amber-400 metric-value">{metrics.latency_ms}ms</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MLflowPanel({ experiments }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? experiments : experiments.filter(e => e.status === filter);

  return (
    <section className="glass-card rounded-2xl p-5" aria-label="MLflow Experiments">
      <SectionHeader icon={<FlaskConical size={16} />} title="MLflow Experiment Tracking" badge={`${experiments.length} runs`}>
        <div className="flex rounded-lg overflow-hidden border border-[#1e2d45]">
          {['all', 'completed', 'running'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === f ? 'bg-blue-500/20 text-blue-300' : 'text-[#8b9ab5] hover:text-[#f0f6ff] hover:bg-[#1e2d45]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </SectionHeader>

      {/* Comparison metrics header */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['Faithfulness', 'Ans. Relevancy', 'Ctx. Precision'].map(m => (
          <MetricPill key={m} label={m} value="↑ Tracking" />
        ))}
      </div>

      <div className="space-y-2.5">
        {filtered.map((exp) => (
          <ExperimentRow
            key={exp.id}
            exp={exp}
            isSelected={selected === exp.id}
            onSelect={() => setSelected(selected === exp.id ? null : exp.id)}
          />
        ))}
      </div>
    </section>
  );
}
