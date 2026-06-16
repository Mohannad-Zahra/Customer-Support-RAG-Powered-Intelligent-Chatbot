import { useState } from 'react';
import { MessageSquare, Search, ThumbsUp, ThumbsDown, Clock, ChevronDown } from 'lucide-react';
import { SectionHeader, StatusBadge } from './ui/SharedComponents';
import { formatDateTime, formatMs } from '../hooks/useAnimations';

function QueryRow({ log, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="border border-[#1e2d45] rounded-xl overflow-hidden transition-all duration-300 hover:border-[#2a3f5f] bg-[#0d1117] hover:bg-[#111827]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <button
        className="w-full flex items-center justify-between p-4 text-left gap-3"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${log.rating === 'positive' ? 'bg-emerald-400' : 'bg-red-400'}`}
            title={`User rating: ${log.rating}`}
          />
          <p className="text-sm text-[#f0f6ff] truncate font-medium">{log.user_input}</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-[#4b5c78]">
            <Clock size={11} />
            <span className="text-xs metric-value">{formatMs(log.latency_ms)}</span>
          </div>
          <span className="text-xs text-[#4b5c78]">{formatDateTime(log.timestamp)}</span>
          <span className={`text-[#4b5c78] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            <ChevronDown size={14} />
          </span>
        </div>
      </button>

      {/* Expanded answer */}
      <div
        className="overflow-hidden transition-all duration-400"
        style={{ maxHeight: expanded ? '200px' : '0px', opacity: expanded ? 1 : 0 }}
      >
        <div className="px-4 pb-4 border-t border-[#1e2d45]">
          <p className="text-xs text-[#4b5c78] uppercase tracking-widest font-semibold pt-3 mb-2">Bot Answer</p>
          <p className="text-sm text-[#8b9ab5] leading-relaxed">{log.answer}</p>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs text-[#4b5c78]">
              <span className="w-4 h-4 rounded bg-[#1e2d45] flex items-center justify-center text-[10px]">k</span>
              {log.retrieved_chunks} chunks
            </span>
            <code className="text-xs text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded font-mono">
              {log.model}
            </code>
            <span className={`flex items-center gap-1 text-xs font-medium ${
              log.rating === 'positive' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {log.rating === 'positive' ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
              {log.rating}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QueryLogsPanel({ logs }) {
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');

  const filtered = logs.filter(l => {
    const matchesSearch = l.user_input.toLowerCase().includes(search.toLowerCase()) ||
                          l.answer.toLowerCase().includes(search.toLowerCase());
    const matchesRating = ratingFilter === 'all' || l.rating === ratingFilter;
    return matchesSearch && matchesRating;
  });

  const positiveCount = logs.filter(l => l.rating === 'positive').length;
  const satisfactionRate = ((positiveCount / logs.length) * 100).toFixed(0);

  return (
    <section className="glass-card rounded-2xl p-5" aria-label="Query Answer Logs">
      <SectionHeader icon={<MessageSquare size={16} />} title="Query / Answer Logs" badge={`${logs.length} recent`}>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <ThumbsUp size={12} className="text-emerald-400" />
          <span className="text-emerald-400">{satisfactionRate}%</span>
          <span className="text-[#4b5c78]">satisfied</span>
        </div>
      </SectionHeader>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4b5c78]" />
          <input
            type="text"
            placeholder="Search queries or answers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-[#0d1117] border border-[#1e2d45] rounded-lg text-[#f0f6ff] placeholder-[#4b5c78] focus:outline-none focus:border-blue-500/50 transition-colors"
            aria-label="Search query logs"
          />
        </div>

        <div className="flex rounded-lg overflow-hidden border border-[#1e2d45]">
          {[['all', 'All'], ['positive', '👍'], ['negative', '👎']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setRatingFilter(val)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                ratingFilter === val ? 'bg-blue-500/20 text-blue-300' : 'text-[#8b9ab5] hover:text-[#f0f6ff] hover:bg-[#1e2d45]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-[#4b5c78] text-sm">No logs match your filter.</div>
        ) : (
          filtered.map((log, i) => <QueryRow key={log.id} log={log} index={i} />)
        )}
      </div>
    </section>
  );
}
