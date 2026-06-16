import { RefreshCw, CheckCircle2, XCircle, SkipForward, Database } from 'lucide-react';
import { SectionHeader, StatusBadge } from './ui/SharedComponents';
import { useCountUp, useInView, formatDate, formatDateTime } from '../hooks/useAnimations';

const STATUS_ICON = {
  success: <CheckCircle2 size={14} className="text-emerald-400" />,
  failed:  <XCircle size={14} className="text-red-400" />,
  skipped: <SkipForward size={14} className="text-amber-400" />,
};

function TimelineItem({ item, isLast }) {
  return (
    <div className="flex gap-3">
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center">
        <div className="mt-0.5">{STATUS_ICON[item.status] || STATUS_ICON.success}</div>
        {!isLast && <div className="w-px flex-1 mt-1 bg-[#1e2d45]" />}
      </div>

      <div className={`pb-4 flex-1 ${isLast ? '' : ''}`}>
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-semibold text-[#f0f6ff]">{formatDateTime(item.date)}</span>
          <StatusBadge status={item.status} />
        </div>
        {item.status !== 'skipped' ? (
          <div className="flex gap-3 mt-1 flex-wrap">
            <span className="text-xs text-[#8b9ab5]">+{item.docs_added} docs</span>
            <span className="text-xs text-[#4b5c78]">{item.duration_s}s duration</span>
          </div>
        ) : (
          <span className="text-xs text-[#4b5c78]">No new documents found</span>
        )}
      </div>
    </div>
  );
}

export function EmbeddingSchedulePanel({ schedule }) {
  const [ref, inView] = useInView(0.1);
  const animDocs = useCountUp(inView ? schedule.docs_indexed : 0, 1400);
  const animPending = useCountUp(inView ? schedule.new_docs_pending : 0, 1200);

  const now = new Date();
  const next = new Date(schedule.next_refresh);
  const hoursUntil = ((next - now) / 3600000).toFixed(1);

  return (
    <section className="glass-card rounded-2xl p-5" aria-label="Embedding Refresh Schedule" ref={ref}>
      <SectionHeader icon={<RefreshCw size={16} />} title="Embeddings Refresh Schedule">
        <StatusBadge status={schedule.status} />
      </SectionHeader>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Indexed', value: animDocs.toLocaleString(), color: 'text-blue-400', icon: <Database size={14} /> },
          { label: 'Pending Docs', value: animPending.toLocaleString(), color: 'text-amber-400', icon: <RefreshCw size={14} /> },
          { label: 'Next in', value: `${hoursUntil}h`, color: 'text-purple-400', icon: <RefreshCw size={14} /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-[#0d1117] border border-[#1e2d45] rounded-xl p-3 text-center">
            <div className={`flex items-center justify-center gap-1 mb-1 ${color}`}>{icon}</div>
            <p className={`text-lg font-bold metric-value ${color}`}>{value}</p>
            <p className="text-[10px] text-[#4b5c78] uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Progress to next refresh */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[#8b9ab5]">Time until next refresh</span>
          <span className="text-xs font-medium text-[#f0f6ff]">{formatDate(schedule.next_refresh)} @ 02:00 UTC</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#1e2d45] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000"
            style={{ width: `${Math.min(((24 - parseFloat(hoursUntil)) / 24) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* History timeline */}
      <div>
        <p className="text-[10px] text-[#4b5c78] uppercase tracking-widest font-semibold mb-3">Refresh History</p>
        <div>
          {schedule.history.map((item, i) => (
            <TimelineItem key={item.date} item={item} isLast={i === schedule.history.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
