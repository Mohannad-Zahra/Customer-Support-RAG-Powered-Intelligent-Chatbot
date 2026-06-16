import { GitBranch, CheckCircle2, Loader, Circle, XCircle, Clock } from 'lucide-react';
import { SectionHeader, StatusBadge } from './ui/SharedComponents';
import { useCountUp, useInView, formatDateTime } from '../hooks/useAnimations';

const STAGE_ICONS = {
  done:    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />,
  running: <Loader size={15} className="text-blue-400 shrink-0 animate-spin" />,
  pending: <Circle size={15} className="text-[#4b5c78] shrink-0" />,
  failed:  <XCircle size={15} className="text-red-400 shrink-0" />,
};

function PipelineStage({ stage, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        {STAGE_ICONS[stage.status]}
        {!isLast && (
          <div className={`w-px flex-1 mt-1 ${
            stage.status === 'done' ? 'bg-emerald-500/30' : 'bg-[#1e2d45]'
          }`} />
        )}
      </div>
      <div className="pb-3 flex-1 flex items-start justify-between">
        <span className={`text-sm font-medium ${
          stage.status === 'done' ? 'text-[#f0f6ff]' :
          stage.status === 'running' ? 'text-blue-300' :
          'text-[#4b5c78]'
        }`}>
          {stage.name}
        </span>
        {stage.duration_s ? (
          <span className="flex items-center gap-1 text-xs text-[#4b5c78]">
            <Clock size={10} /> {stage.duration_s}s
          </span>
        ) : stage.status === 'running' ? (
          <span className="text-xs text-blue-400 animate-pulse">In progress…</span>
        ) : null}
      </div>
    </div>
  );
}

export function PipelinePanel({ pipeline }) {
  const [ref, inView] = useInView(0.1);
  const animProgress = useCountUp(inView ? pipeline.progress : 0, 1600);

  const completedStages = pipeline.stages.filter(s => s.status === 'done').length;
  const totalStages = pipeline.stages.length;

  return (
    <section className="glass-card rounded-2xl p-5" aria-label="Retraining Pipeline Status" ref={ref}>
      <SectionHeader icon={<GitBranch size={16} />} title="Retraining Pipeline">
        <StatusBadge status="running" />
      </SectionHeader>

      {/* Main progress */}
      <div className="bg-[#080c14] rounded-xl border border-[#1e2d45] p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-[#4b5c78] uppercase tracking-wider font-semibold">Current Run</p>
            <p className="text-sm font-semibold text-[#f0f6ff] mt-0.5">{pipeline.stages.find(s => s.status === 'running')?.name || 'Idle'}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-400 metric-value">{animProgress.toFixed(0)}%</p>
            <p className="text-xs text-[#4b5c78]">{completedStages}/{totalStages} stages</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-[#1e2d45] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1500"
            style={{ width: `${inView ? pipeline.progress : 0}%`, transitionDuration: '1.6s' }}
            role="progressbar"
            aria-valuenow={pipeline.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-[#4b5c78]">Started {formatDateTime(pipeline.started_at)}</span>
          <span className="text-xs text-[#4b5c78]">ETA {formatDateTime(pipeline.estimated_completion)}</span>
        </div>
      </div>

      {/* Stage list */}
      <div className="mb-5">
        <p className="text-[10px] text-[#4b5c78] uppercase tracking-widest font-semibold mb-3">Pipeline Stages</p>
        {pipeline.stages.map((stage, i) => (
          <PipelineStage key={stage.name} stage={stage} isLast={i === pipeline.stages.length - 1} />
        ))}
      </div>

      {/* History */}
      <div>
        <p className="text-[10px] text-[#4b5c78] uppercase tracking-widest font-semibold mb-3">Run History</p>
        <div className="space-y-2">
          {pipeline.history.map(run => (
            <div key={run.run_id} className="flex items-center justify-between p-3 rounded-lg bg-[#0d1117] border border-[#1e2d45] hover:border-[#2a3f5f] transition-colors">
              <div className="flex items-center gap-2.5">
                <code className="text-xs text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded font-mono">{run.run_id}</code>
                <span className="text-xs text-[#4b5c78]">{formatDateTime(run.date)}</span>
                <span className="text-[10px] text-[#4b5c78] px-1.5 py-0.5 bg-[#1e2d45] rounded capitalize">{run.trigger}</span>
              </div>
              <div className="flex items-center gap-2.5">
                {run.f1 && <span className="text-xs font-bold text-emerald-400 metric-value">F1: {run.f1}</span>}
                <StatusBadge status={run.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
