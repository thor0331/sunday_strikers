import { useAppContent } from '../../hooks/useAppContent';
import { usePlayers } from '../../hooks/usePlayers';
import { useMatches } from '../../hooks/useMatches';
import { useSeasons } from '../../hooks/useSeasons';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { GlassCard } from '../../components/common/GlassCard';
import type { AboutPageContent } from '../../types/models';
import { useMemo } from 'react';
import { MapPin, Home, Calendar, Mail, Instagram, Facebook, Globe, Users, Trophy, BarChart3, Target, Zap, Heart } from 'lucide-react';

export function AboutPage() {
  const { data: content, isLoading } = useAppContent('about_page');
  const { data: players = [] } = usePlayers();
  const { data: matches = [] } = useMatches();
  const { data: seasons = [] } = useSeasons();
  const { data: stats = [] } = usePlayerStatistics();
  const avatarViewer = useAvatarViewerStore();

  const parsed = useMemo<AboutPageContent | null>(() => {
    if (!content?.content) return null;
    try { return JSON.parse(content.content) as AboutPageContent; } catch { return null; }
  }, [content?.content]);

  const autoStats = useMemo(() => ({
    totalPlayers: players.filter((p) => p.status === 'active').length,
    totalMatches: matches.filter((m) => m.status === 'completed').length,
    totalSeasons: seasons.length,
    totalRuns: stats.reduce((sum, s) => sum + s.runs, 0),
    totalWickets: stats.reduce((sum, s) => sum + s.wickets, 0),
    totalSixes: stats.reduce((sum, s) => sum + s.sixes, 0),
    totalFours: stats.reduce((sum, s) => sum + s.fours, 0),
  }), [players, matches, seasons, stats]);

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="flex flex-col items-center gap-3"><div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div><p className="text-sm font-medium text-slate-500">Loading...</p></div></div>;

  const p = parsed;
  const clubName = p?.clubName || 'Sunday Strikers';
  const clubMotto = p?.clubMotto || '';
  const developers = p?.developers ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Club Header */}
      <div className="glass glass-hover rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden">
        {p?.clubBanner && <div className="absolute inset-0 z-0"><img src={p.clubBanner} alt="" className="h-full w-full object-cover opacity-15" /></div>}
        <div className="relative z-10">
          {p?.clubLogo ? (
            <button onClick={() => avatarViewer.open(p.clubLogo!, clubName)} className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl overflow-hidden shadow-lg ring-4 ring-white/50 hover:scale-105 transition-transform">
              <img src={p.clubLogo} alt={clubName} className="h-full w-full object-cover" />
            </button>
          ) : (
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg">
              <span className="text-3xl">🏏</span>
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">{clubName}</h1>
          {clubMotto && <p className="mt-2 text-sm italic text-slate-500">"{clubMotto}"</p>}
          <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-gradient-to-r from-teal-400 to-teal-600" />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            {p?.establishedYear && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Est. {p.establishedYear}</span>}
            {p?.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location}</span>}
            {p?.homeGround && <span className="flex items-center gap-1"><Home className="w-3 h-3" />{p.homeGround}</span>}
          </div>
        </div>
      </div>

      {/* Auto Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        <StatCard icon={<Users className="w-4 h-4" />} label="Players" value={autoStats.totalPlayers} gradient="from-teal-400 to-teal-600" />
        <StatCard icon={<Trophy className="w-4 h-4" />} label="Matches" value={autoStats.totalMatches} gradient="from-emerald-400 to-emerald-600" />
        <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Seasons" value={autoStats.totalSeasons} gradient="from-blue-400 to-blue-600" />
        <StatCard icon={<Target className="w-4 h-4" />} label="Runs" value={autoStats.totalRuns} gradient="from-amber-400 to-amber-600" />
        <StatCard icon={<Zap className="w-4 h-4" />} label="Wickets" value={autoStats.totalWickets} gradient="from-purple-400 to-purple-600" />
        <StatCard icon={<span className="text-sm font-bold">6</span>} label="Sixes" value={autoStats.totalSixes} gradient="from-rose-400 to-rose-600" />
        <StatCard icon={<span className="text-sm font-bold">4</span>} label="Fours" value={autoStats.totalFours} gradient="from-green-400 to-green-600" />
      </div>

      {/* About Club */}
      {(p?.aboutClub || p?.description) ? (
        <div className="glass glass-hover rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">About the Club</h2>
          <p className="text-sm leading-relaxed text-slate-600">{p?.aboutClub || p?.description}</p>
        </div>
      ) : null}

      {/* Club Story */}
      {p?.clubStory ? (
        <div className="glass glass-hover rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Our Story</h2>
          <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{p.clubStory}</p>
        </div>
      ) : null}

      {/* Mission & Vision */}
      {(p?.mission || p?.vision) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {p?.mission ? (
            <div className="glass glass-hover rounded-2xl p-6">
              <h2 className="mb-2 text-lg font-semibold text-slate-700">Mission</h2>
              <p className="text-sm leading-relaxed text-slate-600">{p.mission}</p>
            </div>
          ) : null}
          {p?.vision ? (
            <div className="glass glass-hover rounded-2xl p-6">
              <h2 className="mb-2 text-lg font-semibold text-slate-700">Vision</h2>
              <p className="text-sm leading-relaxed text-slate-600">{p.vision}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Features */}
      {p?.features && p.features.length > 0 ? (
        <div className="glass glass-hover rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">Features</h2>
          <div className="grid gap-3">
            {p.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white/60 p-4 shadow-sm transition-all hover:border-teal-200 hover:shadow-md">
                <p className="text-sm text-slate-600">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Contact & Social */}
      {(p?.contactEmail || p?.instagram || p?.facebook) ? (
        <div className="glass glass-hover rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Connect With Us</h2>
          <div className="flex flex-wrap gap-3">
            {p?.contactEmail && <a href={`mailto:${p.contactEmail}`} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/60 px-4 py-2 text-sm text-slate-600 hover:border-teal-300 hover:text-teal-600 transition-all"><Mail className="w-4 h-4" />Email</a>}
            {p?.instagram && <a href={p.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/60 px-4 py-2 text-sm text-slate-600 hover:border-teal-300 hover:text-teal-600 transition-all"><Instagram className="w-4 h-4" />Instagram</a>}
            {p?.facebook && <a href={p.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/60 px-4 py-2 text-sm text-slate-600 hover:border-teal-300 hover:text-teal-600 transition-all"><Facebook className="w-4 h-4" />Facebook</a>}
          </div>
        </div>
      ) : null}

      {/* Developers */}
      {developers.length > 0 ? (
        <div className="glass glass-hover rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">Developers</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {developers.map((dev, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white/60 p-4 shadow-sm">
                {dev.photoUrl ? (
                  <button onClick={() => avatarViewer.open(dev.photoUrl!, dev.name, dev.role)} className="shrink-0 h-14 w-14 overflow-hidden rounded-full border-2 border-white shadow-md hover:scale-105 transition-transform">
                    <img src={dev.photoUrl} alt={dev.name} className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <div className="shrink-0 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-lg font-bold text-white">{dev.name.charAt(0)}</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 truncate">{dev.name}</p>
                  {dev.role && <p className="text-xs text-slate-500">{dev.role}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {dev.github && <a href={dev.github} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-teal-600 transition-colors"><Globe className="w-3 h-3 inline" /> GitHub</a>}
                    {dev.linkedin && <a href={dev.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-teal-600 transition-colors"><Globe className="w-3 h-3 inline" /> LinkedIn</a>}
                    {dev.website && <a href={dev.website} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-teal-600 transition-colors"><Globe className="w-3 h-3 inline" /> Website</a>}
                    {dev.email && <a href={`mailto:${dev.email}`} className="text-xs text-slate-400 hover:text-teal-600 transition-colors"><Mail className="w-3 h-3 inline" /> Email</a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 text-center">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Developers</h2>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Heart className="w-4 h-4 text-teal-500" />
            <p>Built with passion by the Sunday Strikers team.</p>
          </div>
        </div>
      )}

      {/* Version */}
      <div className="glass rounded-2xl p-4 text-center">
        <p className="text-xs text-slate-400">Version 1.2</p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: number; gradient: string }) {
  return (
    <GlassCard variant="light" className="p-3 text-center">
      <div className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white shadow-sm`}>{icon}</div>
      <p className="text-lg font-bold text-slate-800 tabular-nums">{value.toLocaleString()}</p>
      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
    </GlassCard>
  );
}
