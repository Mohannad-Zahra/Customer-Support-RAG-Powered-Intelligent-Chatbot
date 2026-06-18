import { useState } from 'react';
import {
  Brain, Activity, RefreshCw, Clock, Zap, MessageSquare,
  BarChart2, GitBranch, FlaskConical, Wifi, WifiOff, AlertCircle
} from 'lucide-react';

import { KPICard } from './components/ui/SharedComponents';
import { MLflowPanel } from './components/MLflowPanel';
import { QueryLogsPanel } from './components/QueryLogsPanel';
import { EmbeddingSchedulePanel } from './components/EmbeddingSchedulePanel';
import { PerformancePanel } from './components/PerformancePanel';
import { PipelinePanel } from './components/PipelinePanel';
import { useLiveClock } from './hooks/useAnimations';
import { useHealth, useQueryLogs, useMetrics, useExperiments, usePipeline, useEmbeddings } from './hooks/useApi';



const NAV_ITEMS = [
  { id: 'overview',    label: 'Overview',    icon: <Activity size={15} /> },
  { id: 'experiments', label: 'Experiments', icon: <FlaskConical size={15} /> },
  { id: 'logs',        label: 'Query Logs',  icon: <MessageSquare size={15} /> },
  { id: 'performance', label: 'Performance', icon: <BarChart2 size={15} /> },
  { id: 'embeddings',  label: 'Embeddings',  icon: <RefreshCw size={15} /> },
  { id: 'pipeline',    label: 'Pipeline',    icon: <GitBranch size={15} /> },
];

// ── Loading skeleton ───────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 rounded-xl shimmer-loading" />
      ))}
    </div>
  );
}

// ── Offline / error banner ─────────────────────────────────────────────────────
function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm mb-4">
      <AlertCircle size={16} className="shrink-0" />
      <span className="flex-1">Backend unreachable: <code className="text-xs">{message}</code> — showing cached data.</span>
      <button
        onClick={onRetry}
        className="text-xs underline hover:text-amber-200 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

// ── Last-updated timestamp ─────────────────────────────────────────────────────
function LastUpdated({ date }) {
  if (!date) return null;
  return (
    <span className="text-[10px] text-[#4b5c78] ml-1">
      Updated {date.toLocaleTimeString()}
    </span>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ active, onSelect, isOnline, model }) {
  return (
    <nav
      className="hidden lg:flex flex-col w-56 shrink-0 bg-[#0d1117] border-r border-[#1e2d45] h-screen sticky top-0 overflow-y-auto"
      aria-label="Dashboard navigation"
    >
      <div className="px-5 py-5 border-b border-[#1e2d45] flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <Brain size={16} className="text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#f0f6ff] leading-none">RAG Monitor</p>
          <p className="text-[10px] text-[#4b5c78] mt-0.5">MLOps Dashboard</p>
        </div>
      </div>

      {/* Live / offline indicator */}
      <div className="px-5 py-3 border-b border-[#1e2d45]">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span className={`text-xs font-medium ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
            {isOnline ? `Live • ${model}` : 'Offline — mock data'}
          </span>
        </div>
      </div>

      <div className="py-3 px-3 flex-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm font-medium mb-0.5 transition-all duration-200 ${
              active === item.id
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                : 'text-[#8b9ab5] hover:text-[#f0f6ff] hover:bg-[#1e2d45] border border-transparent'
            }`}
            aria-current={active === item.id ? 'page' : undefined}
          >
            <span className={active === item.id ? 'text-blue-400' : 'text-[#4b5c78]'}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-[#1e2d45]">
        <p className="text-[10px] text-[#4b5c78]">Customer Support RAG v0.1</p>
        <p className="text-[10px] text-[#4b5c78]">DEPI · 2026</p>
      </div>
    </nav>
  );
}

// ── Mobile nav ────────────────────────────────────────────────────────────────
function MobileNav({ active, onSelect }) {
  return (
    <div
      className="lg:hidden flex overflow-x-auto border-b border-[#1e2d45] bg-[#0d1117] px-3 py-2 gap-1 sticky top-0 z-30"
      role="navigation"
      aria-label="Mobile navigation"
      style={{ scrollbarWidth: 'none' }}
    >
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
            active === item.id ? 'bg-blue-500/20 text-blue-300' : 'text-[#8b9ab5] hover:text-[#f0f6ff]'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header({ clock, isOnline }) {
  return (
    <header className="bg-[#0d1117]/80 backdrop-blur-md border-b border-[#1e2d45] px-6 py-3 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2 lg:hidden">
        <Brain size={16} className="text-blue-400" />
        <span className="text-sm font-bold text-[#f0f6ff]">RAG Monitor</span>
      </div>
      <div className="hidden lg:flex items-center gap-2 text-[#8b9ab5]">
        {isOnline
          ? <Wifi size={13} className="text-emerald-400" />
          : <WifiOff size={13} className="text-red-400" />
        }
        <span className="text-xs">
          {isOnline ? 'Connected to Pinecone · Gemini API' : 'Backend offline'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-[#4b5c78]">
          <Clock size={12} />
          <span className="metric-value font-mono">{clock.toLocaleTimeString()}</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
          isOnline
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-red-500/10 border-red-500/20'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span className={`text-xs font-medium ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
            {isOnline ? 'System Healthy' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}

// ── Overview page (uses live data) ────────────────────────────────────────────
function OverviewPage({ kpis, timeline, liveLogs, livePipeline, liveEmbeddings, metricsError, logsError, metricsRefetch, logsRefetch, metricsUpdated }) {
  const logs = liveLogs ?? [];

  return (
    <div className="space-y-6">
      {metricsError && <ErrorBanner message={metricsError} onRetry={metricsRefetch} />}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Queries Today"  value={kpis.total_queries_today}      change={kpis.queries_change}      icon={<MessageSquare size={16} />} color="blue"   delay={0}   />
        <KPICard title="Avg Latency"    value={kpis.avg_latency_ms} unit="ms"  change={kpis.latency_change}      icon={<Zap size={16} />}           color="amber"  delay={80}  />
        <KPICard title="Satisfaction"   value={kpis.satisfaction_rate * 100}   change={kpis.satisfaction_change} icon={<Activity size={16} />}      color="green"  delay={160} decimals={1} unit="%" />
        <KPICard title="Faithfulness"   value={kpis.faithfulness_score * 100}  change={kpis.faithfulness_change} icon={<Brain size={16} />}         color="purple" delay={240} decimals={1} unit="%" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PerformancePanel timeline={timeline} kpis={kpis} />
        <div>
          {logsError && <ErrorBanner message={logsError} onRetry={logsRefetch} />}
          <QueryLogsPanel logs={logs.slice(0, 3)} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PipelinePanel pipeline={livePipeline} />
        <EmbeddingSchedulePanel schedule={liveEmbeddings} />
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activePage, setActivePage] = useState('overview');
  const clock = useLiveClock();

  // ── Live data hooks ──────────────────────────────────────────────────────────
  const { isOnline, model }                                       = useHealth(30_000);
  const { data: liveLogs,  loading: logsLoading,  error: logsError,  refetch: logsRefetch  } = useQueryLogs(50);
  const { data: liveKpis,  loading: kpisLoading,  error: kpisError,  refetch: kpisRefetch, lastUpdated: metricsUpdated } = useMetrics();
  const { data: liveExperiments } = useExperiments();
  const { data: livePipeline } = usePipeline();
  const { data: liveEmbeddings } = useEmbeddings();

  const kpis = liveKpis || {
    total_queries_today: 0,
    avg_latency_ms: 0,
    satisfaction_rate: 0,
    faithfulness_score: 0,
    queries_change: 0,
    latency_change: 0,
    satisfaction_change: 0,
    faithfulness_change: 0,
  };

  const timeline = liveKpis?.hourly_timeline?.length
    ? liveKpis.hourly_timeline.map(h => ({
        time:         h.hour,
        faithfulness: kpis.faithfulness_score || 0,
        relevancy:    0, // static until RAGAS is live
        latency:      Math.round(h.avg_latency || 0),
        satisfaction: kpis.satisfaction_rate || 0,
      }))
    : [];

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return (
          <OverviewPage
            kpis={kpis}
            timeline={timeline}
            liveLogs={liveLogs}
            livePipeline={livePipeline}
            liveEmbeddings={liveEmbeddings}
            metricsError={kpisError}
            logsError={logsError}
            metricsRefetch={kpisRefetch}
            logsRefetch={logsRefetch}
            metricsUpdated={metricsUpdated}
          />
        );
      case 'experiments':
        return <MLflowPanel experiments={liveExperiments} />;
      case 'logs':
        return logsLoading && !liveLogs?.length
          ? <LoadingSkeleton />
          : (
            <>
              {logsError && <ErrorBanner message={logsError} onRetry={logsRefetch} />}
              <QueryLogsPanel logs={liveLogs ?? []} />
            </>
          );
      case 'performance':
        return <PerformancePanel timeline={timeline} kpis={kpis} />;
      case 'embeddings':
        return <EmbeddingSchedulePanel schedule={liveEmbeddings} />;
      case 'pipeline':
        return <PipelinePanel pipeline={livePipeline} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar active={activePage} onSelect={setActivePage} isOnline={isOnline} model={model} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header clock={clock} isOnline={isOnline} />
        <MobileNav active={activePage} onSelect={setActivePage} />

        <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-6" id="main-content">
          <div key={activePage} className="animate-fade-in max-w-screen-2xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}
