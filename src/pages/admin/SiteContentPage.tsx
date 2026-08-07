import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { TextField, TextAreaField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { useAppContent, useUpdateAppContent, useCreateDefaultContent, useUploadPhoto } from '../../hooks/useAppContent';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { useToastStore } from '../../stores/toastStore';
import type { AboutPageContent, DeveloperCard } from '../../types/models';
import { useState, useEffect, type FormEvent } from 'react';
import { Camera, Loader2, AlertTriangle, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Skeleton } from '../../components/common/Skeleton';

const EMPTY_DEV: DeveloperCard = { name: '', role: '', photoUrl: '', email: '', github: '', linkedin: '', website: '' };

export function SiteContentPage() {
  const { data: content, isLoading, error } = useAppContent('about_page');
  const updateContent = useUpdateAppContent();
  const createDefault = useCreateDefaultContent();
  const uploadPhoto = useUploadPhoto();
  const avatarViewer = useAvatarViewerStore();
  const showToast = useToastStore((s) => s.show);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [footerNote, setFooterNote] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [clubLogo, setClubLogo] = useState('');
  const [clubBanner, setClubBanner] = useState('');
  const [clubName, setClubName] = useState('');
  const [establishedYear, setEstablishedYear] = useState('');
  const [homeGround, setHomeGround] = useState('');
  const [location, setLocation] = useState('');
  const [clubMotto, setClubMotto] = useState('');
  const [aboutClub, setAboutClub] = useState('');
  const [clubStory, setClubStory] = useState('');
  const [mission, setMission] = useState('');
  const [vision, setVision] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [developers, setDevelopers] = useState<DeveloperCard[]>([]);

  useEffect(() => {
    if (!content) return;
    setTitle(content.title || '');
    let parsed: AboutPageContent | null = null;
    try { parsed = JSON.parse(content.content) as AboutPageContent; } catch { parsed = null; }
    if (!parsed) return;
    setDescription(parsed.description || '');
    setFeaturesText(parsed.features?.join('\n') || '');
    setFooterNote(parsed.footerNote || '');
    setProfilePhotoUrl(parsed.profilePhotoUrl || '');
    setClubLogo(parsed.clubLogo || '');
    setClubBanner(parsed.clubBanner || '');
    setClubName(parsed.clubName || '');
    setEstablishedYear(parsed.establishedYear || '');
    setHomeGround(parsed.homeGround || '');
    setLocation(parsed.location || '');
    setClubMotto(parsed.clubMotto || '');
    setAboutClub(parsed.aboutClub || '');
    setClubStory(parsed.clubStory || '');
    setMission(parsed.mission || '');
    setVision(parsed.vision || '');
    setContactEmail(parsed.contactEmail || '');
    setInstagram(parsed.instagram || '');
    setFacebook(parsed.facebook || '');
    setDevelopers(parsed.developers?.length ? parsed.developers : []);
  }, [content]);

  function buildContent(): AboutPageContent {
    return {
      description: description.trim(),
      features: featuresText.split('\n').map((f) => f.trim()).filter(Boolean),
      footerNote: footerNote.trim(),
      profilePhotoUrl,
      clubLogo, clubBanner, clubName: clubName.trim(), establishedYear: establishedYear.trim(),
      homeGround: homeGround.trim(), location: location.trim(), clubMotto: clubMotto.trim(),
      aboutClub: aboutClub.trim(), clubStory: clubStory.trim(), mission: mission.trim(), vision: vision.trim(),
      contactEmail: contactEmail.trim(), instagram: instagram.trim(), facebook: facebook.trim(),
      developers: developers.filter((d) => d.name.trim())
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!content) return;
    try {
      await updateContent.mutateAsync({ id: content.id, input: { title: title.trim() || 'About Sunday Strikers', content: JSON.stringify(buildContent()) } });
      showToast('About page content saved successfully.', 'success');
    } catch { showToast('Failed to save content. Please try again.', 'error'); }
  }

  async function handleCreateDefault() {
    try { await createDefault.mutateAsync(); showToast('Default content created successfully.', 'success'); }
    catch { showToast('Failed to create default content.', 'error'); }
  }

  async function handlePhotoUpload(file: File, folder: string, filename: string, setter: (url: string) => void) {
    try { const url = await uploadPhoto.mutateAsync({ file, folder, filename }); setter(url); showToast('Photo uploaded.', 'success'); }
    catch { showToast('Failed to upload photo.', 'error'); }
  }

  function updateDeveloper(index: number, field: keyof DeveloperCard, value: string) {
    setDevelopers((prev) => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  }

  function addDeveloper() { setDevelopers((prev) => [...prev, { ...EMPTY_DEV }]); }
  function removeDeveloper(index: number) { setDevelopers((prev) => prev.filter((_, i) => i !== index)); }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-56 rounded-[18px]" /><Skeleton className="h-96 w-full rounded-[18px]" /></div>;

  if (error) return <PagePanel title="About Page Editor"><div className="flex flex-col items-center gap-4 py-8 text-center"><AlertTriangle className="h-10 w-10 text-red-400" /><p className="text-sm font-semibold text-red-400">Failed to load content</p><Button variant="secondary" onClick={handleCreateDefault} disabled={createDefault.isPending}>Initialize Default Content</Button></div></PagePanel>;

  if (!content) return <PagePanel title="About Page Editor"><div className="flex flex-col items-center gap-4 py-8 text-center"><RefreshCw className="h-10 w-10 text-slate-300" /><p className="text-sm font-semibold text-slate-300">Content not found</p><Button onClick={handleCreateDefault} disabled={createDefault.isPending}>{createDefault.isPending ? 'Creating...' : 'Create Default Content'}</Button></div></PagePanel>;

  return (
    <div className="space-y-4">
      <PagePanel title="About Page Editor">
        <form className="grid gap-6" onSubmit={submit}>
          {/* Club Identity */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Club Identity</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <PhotoField label="Club Logo" url={clubLogo} onUpload={(f) => handlePhotoUpload(f, 'club', 'logo', setClubLogo)} onRemove={() => setClubLogo('')} onView={clubLogo ? () => avatarViewer.open(clubLogo, 'Club Logo') : undefined} isPending={uploadPhoto.isPending} />
              <PhotoField label="Club Banner" url={clubBanner} onUpload={(f) => handlePhotoUpload(f, 'club', 'banner', setClubBanner)} onRemove={() => setClubBanner('')} onView={clubBanner ? () => avatarViewer.open(clubBanner, 'Club Banner') : undefined} isPending={uploadPhoto.isPending} />
            </div>
            <TextField label="Club Name" value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Sunday Strikers" />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Established Year" value={establishedYear} onChange={(e) => setEstablishedYear(e.target.value)} placeholder="2024" />
              <TextField label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Home Ground" value={homeGround} onChange={(e) => setHomeGround(e.target.value)} placeholder="Stadium Name" />
              <TextField label="Club Motto" value={clubMotto} onChange={(e) => setClubMotto(e.target.value)} placeholder="Play with passion" />
            </div>
          </div>

          {/* About Content */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">About Content</h3>
            <TextAreaField label="About Club" value={aboutClub} onChange={(e) => setAboutClub(e.target.value)} placeholder="Tell us about the club..." rows={3} />
            <TextAreaField label="Club Story" value={clubStory} onChange={(e) => setClubStory(e.target.value)} placeholder="The story of how it all began..." rows={3} />
            <TextAreaField label="Mission" value={mission} onChange={(e) => setMission(e.target.value)} placeholder="Our mission..." rows={2} />
            <TextAreaField label="Vision" value={vision} onChange={(e) => setVision(e.target.value)} placeholder="Our vision..." rows={2} />
            <TextAreaField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Page description..." rows={3} />
            <TextAreaField label="Features (one per line)" value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} placeholder="🏏 Live Scoring..." rows={5} />
          </div>

          {/* Social & Contact */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Social & Contact</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Contact Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="hello@club.com" type="email" />
              <TextField label="Instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." />
            </div>
            <TextField label="Facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." />
          </div>

          {/* Developer Photo */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Developer (Footer)</h3>
            <PhotoField label="Profile Photo" url={profilePhotoUrl} onUpload={(f) => handlePhotoUpload(f, 'developer', 'profile', setProfilePhotoUrl)} onRemove={() => setProfilePhotoUrl('')} onView={profilePhotoUrl ? () => avatarViewer.open(profilePhotoUrl, 'Developer') : undefined} isPending={uploadPhoto.isPending} />
            <TextField label="Footer Note" value={footerNote} onChange={(e) => setFooterNote(e.target.value)} placeholder="Built by Arun R." />
          </div>

          {/* Developer Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Developer Cards</h3>
              <Button type="button" variant="secondary" className="text-xs px-3 py-1.5" onClick={addDeveloper}><Plus className="w-3 h-3 mr-1 inline" />Add</Button>
            </div>
            {developers.map((dev, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Developer {i + 1}</span>
                  <button type="button" onClick={() => removeDeveloper(i)} className="text-red-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label="Name" value={dev.name} onChange={(e) => updateDeveloper(i, 'name', e.target.value)} placeholder="Full Name" />
                  <TextField label="Role" value={dev.role} onChange={(e) => updateDeveloper(i, 'role', e.target.value)} placeholder="Developer" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField label="Email" value={dev.email ?? ''} onChange={(e) => updateDeveloper(i, 'email', e.target.value)} placeholder="email@example.com" type="email" />
                  <TextField label="GitHub" value={dev.github ?? ''} onChange={(e) => updateDeveloper(i, 'github', e.target.value)} placeholder="https://github.com/..." />
                  <TextField label="LinkedIn" value={dev.linkedin ?? ''} onChange={(e) => updateDeveloper(i, 'linkedin', e.target.value)} placeholder="https://linkedin.com/..." />
                </div>
                <TextField label="Website" value={dev.website ?? ''} onChange={(e) => updateDeveloper(i, 'website', e.target.value)} placeholder="https://..." />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={updateContent.isPending} className="sm:flex-none">{updateContent.isPending ? 'Saving...' : 'Save Changes'}</Button>
          </div>
          <MutationStatus error={updateContent.error} success={null} />
        </form>
      </PagePanel>
    </div>
  );
}

function PhotoField({ label, url, onUpload, onRemove, onView, isPending }: { label: string; url: string; onUpload: (f: File) => void; onRemove: () => void; onView?: () => void; isPending: boolean }) {
  const inputId = `photo-${label.replace(/\s/g, '-')}`;
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-slate-300">{label}</label>
      <div className="flex items-center gap-3">
        {url ? (
          <div className="relative group">
            <button type="button" onClick={onView} className="h-16 w-16 overflow-hidden rounded-xl border-2 border-white shadow-md">
              <img src={url} alt={label} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </button>
            {isPending && <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>}
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-white/[0.04] text-slate-400">
            <Camera className="w-5 h-5" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className="cursor-pointer text-xs font-medium text-teal-400 hover:text-teal-300">{url ? 'Change' : 'Upload'}</label>
          <input id={inputId} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
          {url && <button type="button" onClick={onRemove} className="text-xs font-medium text-red-500 hover:text-red-400">Remove</button>}
        </div>
      </div>
    </div>
  );
}
