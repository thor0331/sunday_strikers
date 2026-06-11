import { useAppContent } from '../../hooks/useAppContent';
import type { AboutPageContent } from '../../types/models';

export function AboutPage() {
  const { data: content, isLoading } = useAppContent('about_page');

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  let parsed: AboutPageContent | null = null;
  if (content?.content) {
    try {
      parsed = JSON.parse(content.content) as AboutPageContent;
    } catch {
      parsed = null;
    }
  }

  const title = content?.title || 'About Sunday Strikers';
  const description = parsed?.description || '';
  const features = parsed?.features || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass glass-hover rounded-2xl p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg">
          <span className="text-3xl">🏏</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
          {title}
        </h1>
        <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-gradient-to-r from-teal-400 to-teal-600" />
      </div>

      {description ? (
        <div className="glass glass-hover rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Description</h2>
          <p className="text-sm leading-relaxed text-slate-600">{description}</p>
        </div>
      ) : null}

      {features.length > 0 ? (
        <div className="glass glass-hover rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">Features</h2>
          <div className="grid gap-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white/60 p-4 shadow-sm transition-all hover:border-teal-200 hover:shadow-md"
              >
                <div className="mt-0.5 shrink-0 text-lg">
                  {feature.match(/^([\u{1F000}-\u{1FFFF}]|\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/u)?.[0] || '•'}
                </div>
                <p className="text-sm text-slate-600">{feature.replace(/^[\u{1F000}-\u{1FFFF}]|\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]\s*/u, '')}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="glass rounded-2xl p-6 text-center">
        <h2 className="mb-3 text-lg font-semibold text-slate-700">Platform Overview</h2>
        <p className="text-sm text-slate-500">
          Sunday Strikers is a full-featured cricket management platform built with modern web
          technologies. Track every ball, manage your squad, and celebrate your cricket journey.
        </p>
      </div>

      <div className="glass rounded-2xl p-6 text-center">
        <h2 className="mb-3 text-lg font-semibold text-slate-700">Developer Information</h2>
        <p className="text-sm text-slate-500">
          Built by <span className="font-medium text-slate-700">Arun R.</span>
        </p>
      </div>

      <div className="glass rounded-2xl p-6 text-center">
        <h2 className="mb-3 text-lg font-semibold text-slate-700">Version Information</h2>
        <p className="text-sm text-slate-500">Version 1.0</p>
      </div>
    </div>
  );
}
