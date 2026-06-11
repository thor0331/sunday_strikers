import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { TextField, TextAreaField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { useAppContent, useUpdateAppContent, useCreateDefaultContent, useUploadDeveloperPhoto, useDeleteDeveloperPhoto } from '../../hooks/useAppContent';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { useToastStore } from '../../stores/toastStore';
import type { AboutPageContent } from '../../types/models';
import { useState, useEffect, type FormEvent } from 'react';
import { Camera, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

export function SiteContentPage() {
  const { data: content, isLoading, error } = useAppContent('about_page');
  const updateContent = useUpdateAppContent();
  const createDefault = useCreateDefaultContent();
  const uploadPhoto = useUploadDeveloperPhoto();
  const deletePhoto = useDeleteDeveloperPhoto();
  const avatarViewer = useAvatarViewerStore();
  const showToast = useToastStore((s) => s.show);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [footerNote, setFooterNote] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');

  useEffect(() => {
    if (!content) return;
    setTitle(content.title || '');
    let parsed: AboutPageContent | null = null;
    try {
      parsed = JSON.parse(content.content) as AboutPageContent;
    } catch {
      parsed = null;
    }
    setDescription(parsed?.description || '');
    setFeaturesText(parsed?.features?.join('\n') || '');
    setFooterNote(parsed?.footerNote || '');
    setProfilePhotoUrl(parsed?.profilePhotoUrl || '');
  }, [content]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!content) return;

    const aboutContent: AboutPageContent = {
      description: description.trim(),
      features: featuresText.split('\n').map((f) => f.trim()).filter(Boolean),
      footerNote: footerNote.trim(),
      profilePhotoUrl: profilePhotoUrl
    };

    try {
      await updateContent.mutateAsync({
        id: content.id,
        input: {
          title: title.trim() || 'About Sunday Strikers',
          content: JSON.stringify(aboutContent)
        }
      });
      showToast('About page content saved successfully.', 'success');
    } catch {
      showToast('Failed to save content. Please try again.', 'error');
    }
  }

  async function handleCreateDefault() {
    try {
      await createDefault.mutateAsync();
      showToast('Default content created successfully.', 'success');
    } catch {
      showToast('Failed to create default content. Check that the app_content table exists.', 'error');
    }
  }

  async function handlePhotoUpload(file: File) {
    try {
      const url = await uploadPhoto.mutateAsync(file);
      setProfilePhotoUrl(url);
      showToast('Photo uploaded successfully.', 'success');
    } catch {
      showToast('Failed to upload photo. Please try again.', 'error');
    }
  }

  async function handleDeletePhoto() {
    try {
      await deletePhoto.mutateAsync();
      setProfilePhotoUrl('');
      showToast('Photo removed.', 'success');
    } catch {
      showToast('Failed to remove photo.', 'error');
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return (
      <PagePanel title="About Page Editor">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <AlertTriangle className="h-10 w-10 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-600">Failed to load content</p>
            <p className="mt-1 text-xs text-slate-500 max-w-md break-all">{message}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleCreateDefault}
              disabled={createDefault.isPending}
            >
              {createDefault.isPending ? 'Creating...' : 'Initialize Default Content'}
            </Button>
          </div>
        </div>
      </PagePanel>
    );
  }

  if (!content) {
    return (
      <PagePanel title="About Page Editor">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <RefreshCw className="h-10 w-10 text-slate-300" />
          <div>
            <p className="text-sm font-semibold text-slate-600">Content not found</p>
            <p className="mt-1 text-xs text-slate-400">
              The about_page row does not exist in the app_content table.
              Run the database migration or create default content below.
            </p>
          </div>
          <Button
            onClick={handleCreateDefault}
            disabled={createDefault.isPending}
          >
            {createDefault.isPending ? 'Creating...' : 'Create Default Content'}
          </Button>
          <MutationStatus error={createDefault.error} success={null} />
        </div>
      </PagePanel>
    );
  }

  return (
    <div className="space-y-4">
      <PagePanel title="About Page Editor">
        <form className="grid gap-4" onSubmit={submit}>
          <div className="flex flex-col items-center gap-3 pb-2">
            <p className="text-sm font-medium text-slate-700">Profile Photo</p>
            <div className="relative w-20 h-20 sm:w-24 sm:h-24">
              {profilePhotoUrl ? (
                <button
                  type="button"
                  onClick={() => avatarViewer.open(profilePhotoUrl, 'Arun R.', 'Developer \u2022 Sunday Strikers')}
                  className="h-full w-full overflow-hidden rounded-full border-2 border-white shadow-md transition-transform hover:scale-105"
                >
                  <img src={profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" />
                </button>
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-lg font-bold text-white sm:text-xl border-2 border-white shadow-md">
                  A
                </div>
              )}
              {uploadPhoto.isPending ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-white sm:h-7 sm:w-7" />
                </div>
              ) : (
                <>
                  <div
                    className="absolute inset-0 hidden cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 backdrop-blur-[1px] transition-opacity hover:opacity-100 sm:flex"
                    onClick={() => document.getElementById('dev-photo-input')?.click()}
                  >
                    <Camera className="h-5 w-5 text-white drop-shadow-sm" />
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById('dev-photo-input')?.click()}
                    className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-teal-500 text-white shadow-md border-2 border-white transition-transform hover:scale-110 active:scale-95 sm:hidden"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <input
                id="dev-photo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handlePhotoUpload(file);
                  e.target.value = '';
                }}
              />
            </div>
            {profilePhotoUrl && !uploadPhoto.isPending ? (
              <button
                type="button"
                onClick={handleDeletePhoto}
                className="text-[11px] font-medium text-red-500 hover:text-red-600 transition-colors"
              >
                Delete Photo
              </button>
            ) : null}
          </div>

          <TextField
            label="Developer Name"
            value={title === 'About Sunday Strikers' ? '' : title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Arun R."
          />
          <TextField
            label="Developer Role"
            value={footerNote}
            onChange={(e) => setFooterNote(e.target.value)}
            placeholder="Developer • Sunday Strikers"
          />
          <TextAreaField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter about page description..."
            rows={4}
          />
          <TextAreaField
            label="Features (one per line)"
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
            placeholder="🏏 Live Scoring&#10;📊 Statistics&#10;🏆 Leaderboards"
            rows={6}
          />
          <div className="flex gap-2">
            <Button disabled={updateContent.isPending}>
              {updateContent.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
          <MutationStatus
            error={updateContent.error}
            success={null}
          />
        </form>
      </PagePanel>
    </div>
  );
}
