import { useCountUp, useInView } from '../../hooks/useAnimations';

const CHANGE_COLORS = {
  positive: 'text-emerald-400',
  negative: 'text-red-400',
};

function ChangeIndicator({ value }) {
  const isPositive = value >= 0;
  const color = isPositive ? CHANGE_COLORS.positive : CHANGE_COLORS.negative;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${color}`}>
      <span>{isPositive ? '▲' : '▼'}</span>
      <span>{Math.abs(value).toFixed(1)}%</span>
    </span>
  );
}

/**
 * @param {{ title: string, value: number, unit?: string, change?: number, icon: React.ReactNode, color: string, decimals?: number }} props
 */
export function KPICard({ title, value, unit = '', change, icon, color, decimals = 0, delay = 0 }) {
  const [ref, inView] = useInView(0.1);
  const animated = useCountUp(inView ? value : 0, 1400, decimals);

  const colorMap = {
    blue: {
      icon: 'bg-blue-500/10 text-blue-400',
      glow: 'shadow-blue-500/10',
      border: 'hover:border-blue-500/30',
    },
    green: {
      icon: 'bg-emerald-500/10 text-emerald-400',
      glow: 'shadow-emerald-500/10',
      border: 'hover:border-emerald-500/30',
    },
    amber: {
      icon: 'bg-amber-500/10 text-amber-400',
      glow: 'shadow-amber-500/10',
      border: 'hover:border-amber-500/30',
    },
    purple: {
      icon: 'bg-purple-500/10 text-purple-400',
      glow: 'shadow-purple-500/10',
      border: 'hover:border-purple-500/30',
    },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      ref={ref}
      className={`glass-card rounded-xl p-5 flex flex-col gap-3 cursor-default shadow-lg ${c.glow} ${c.border}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#8b9ab5] uppercase tracking-widest">{title}</span>
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.icon}`}>{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="metric-value text-3xl font-bold text-[#f0f6ff]">
          {animated.toLocaleString()}{unit}
        </span>
        {change !== undefined && <ChangeIndicator value={change} />}
      </div>
    </div>
  );
}

/**
 * Circular gauge / arc progress
 */
export function GaugeCard({ label, value, max = 1, color = '#3b82f6', size = 96 }) {
  const [ref, inView] = useInView();
  const animated = useCountUp(inView ? value : 0, 1200, 2);

  const pct = value / max;
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const dash = pct * circ;

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 90 90" aria-label={`${label}: ${(value * 100).toFixed(1)}%`}>
        {/* Track */}
        <circle cx="45" cy="45" r={radius} fill="none" stroke="#1e2d45" strokeWidth="8" />
        {/* Fill */}
        <circle
          cx="45" cy="45" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={inView ? circ - dash : circ}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
        <text x="45" y="49" textAnchor="middle" fill="#f0f6ff" fontSize="13" fontWeight="700" fontFamily="Inter, sans-serif">
          {(animated * 100).toFixed(0)}%
        </text>
      </svg>
      <span className="text-xs text-[#8b9ab5] font-medium text-center leading-tight">{label}</span>
    </div>
  );
}

/**
 * Section heading shared component
 */
export function SectionHeader({ icon, title, badge, children }) {
  return (
    <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
      <div className="flex items-center gap-2.5">
        <span className="text-[#8b9ab5]">{icon}</span>
        <h2 className="text-base font-semibold text-[#f0f6ff]">{title}</h2>
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#1e2d45] text-[#8b9ab5]">{badge}</span>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/**
 * Status badge
 */
export function StatusBadge({ status }) {
  const map = {
    completed: { label: 'Completed', cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
    running:   { label: 'Running',   cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
    pending:   { label: 'Pending',   cls: 'bg-[#1e2d45] text-[#8b9ab5] border border-[#2a3f5f]' },
    failed:    { label: 'Failed',    cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
    success:   { label: 'Success',   cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
    skipped:   { label: 'Skipped',   cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
    scheduled: { label: 'Scheduled', cls: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
    done:      { label: 'Done',      cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {(status === 'running') && <span className="status-dot live" style={{ width: 6, height: 6, color: '#3b82f6' }} />}
      {s.label}
    </span>
  );
}

/**
 * Metric pill
 */
export function MetricPill({ label, value, unit = '' }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161d2e] border border-[#1e2d45]">
      <span className="text-[10px] text-[#4b5c78] uppercase tracking-wider font-semibold">{label}</span>
      <span className="text-xs font-bold text-[#f0f6ff] metric-value">{value}{unit}</span>
    </div>
  );
}
