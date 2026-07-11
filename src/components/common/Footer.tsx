import { useAppContent } from '../../hooks/useAppContent';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import type { AboutPageContent } from '../../types/models';

export function Footer() {
  const { data: content } = useAppContent('about_page');
  const avatarViewer = useAvatarViewerStore();

  let parsed: AboutPageContent | null = null;
  if (content?.content) {
    try {
      parsed = JSON.parse(content.content) as AboutPageContent;
    } catch {
      parsed = null;
    }
  }

  const developers = parsed?.developers ?? [];
  const fallbackName = parsed?.footerNote?.replace(/^Built by\s*/i, '') || 'Arun R.';
  const fallbackPhoto = parsed?.profilePhotoUrl || '';

  const displayDevelopers = developers.length > 0 ? developers : [{ name: fallbackName, role: 'Developer', photoUrl: fallbackPhoto }];

  return (
    <footer className="border-t border-slate-200/70 bg-white/95 mt-8">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            {parsed?.clubLogo ? (
              <img src={parsed.clubLogo} alt={parsed.clubName || 'Club'} className="h-6 w-6 rounded object-cover" />
            ) : null}
            <span className="text-base font-bold text-teal-600">{parsed?.clubName || 'Sunday Strikers'}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {displayDevelopers.map((dev, i) => (
              <div key={i} className="flex items-center gap-2">
                {dev.photoUrl ? (
                  <button
                    onClick={() => avatarViewer.open(dev.photoUrl!, dev.name, dev.role)}
                    className="shrink-0 h-8 w-8 overflow-hidden rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 hover:ring-2 hover:ring-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    <img src={dev.photoUrl} alt={dev.name} className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-xs font-bold text-white border-2 border-white shadow-md">
                    {dev.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <span className="text-xs font-medium text-slate-600 block">{dev.name}</span>
                  {dev.role && <span className="text-[10px] text-slate-400">{dev.role}</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs font-medium text-slate-400">Version 1.2</p>
        </div>
      </div>
    </footer>
  );
}
