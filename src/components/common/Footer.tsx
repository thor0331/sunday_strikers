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

  const photoUrl = parsed?.profilePhotoUrl || '';
  const footerNote = parsed?.footerNote || 'Built by Arun R.';
  const developerName = footerNote.replace(/^Built by\s*/i, '') || 'Arun R.';

  return (
    <footer className="border-t border-slate-200/70 bg-white/95 mt-8">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-teal-600">Sunday Strikers</span>
          </div>
          <p className="text-xs font-medium text-slate-400">Version 1.0</p>
          <div className="flex items-center gap-2">
            {photoUrl ? (
              <button
                onClick={() => avatarViewer.open(photoUrl, developerName, 'Developer \u2022 Sunday Strikers')}
                className="shrink-0 h-8 w-8 overflow-hidden rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 hover:ring-2 hover:ring-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <img src={photoUrl} alt={developerName} className="h-full w-full object-cover" />
              </button>
            ) : (
              <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-xs font-bold text-white border-2 border-white shadow-md">
                {developerName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs text-slate-500">
              Built by <span className="font-medium text-slate-600">{developerName}</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
