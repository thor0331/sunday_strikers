import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { SelectField, TextField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { useCreatePlayer, useDeletePlayer, usePlayers, useUpdatePlayer, useUploadPlayerPhoto } from '../../hooks/usePlayers';
import { usePlayerUiStore } from '../../stores/playerUiStore';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import type { PlayerStatus } from '../../types/models';
import { useEffect, useState, type FormEvent } from 'react';

export function PlayerManagementPage() {
  const avatarViewer = useAvatarViewerStore();
  const { data: players = [], isLoading } = usePlayers();
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();
  const uploadPhoto = useUploadPlayerPhoto();
  const { editingPlayer, setEditingPlayer } = usePlayerUiStore();
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [battingStyle, setBattingStyle] = useState('');
  const [bowlingStyle, setBowlingStyle] = useState('');
  const [status, setStatus] = useState<PlayerStatus>('active');

  useEffect(() => {
    setDisplayName(editingPlayer?.display_name ?? '');
    setFullName(editingPlayer?.full_name ?? '');
    setPhone(editingPlayer?.phone ?? '');
    setBattingStyle(editingPlayer?.batting_style ?? '');
    setBowlingStyle(editingPlayer?.bowling_style ?? '');
    setStatus(editingPlayer?.status ?? 'active');
  }, [editingPlayer]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const input = {
      display_name: displayName.trim(),
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      batting_style: battingStyle.trim() || null,
      bowling_style: bowlingStyle.trim() || null,
      status
    };

    if (editingPlayer) {
      await updatePlayer.mutateAsync({ id: editingPlayer.id, input });
      setEditingPlayer(null);
    } else {
      await createPlayer.mutateAsync(input);
      setDisplayName('');
      setFullName('');
      setPhone('');
      setBattingStyle('');
      setBowlingStyle('');
      setStatus('active');
    }
  }

  async function removePlayer(playerId: string) {
    if (window.confirm('Delete this player? Match history will keep references where Supabase constraints allow it.')) {
      await deletePlayer.mutateAsync(playerId);
    }
  }

  return (
    <div className="space-y-4">
      <PagePanel title="Manage Players">
        <form className="grid gap-3" onSubmit={submit}>
          <TextField label="Display Name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          <TextField label="Full Name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <TextField label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" />
          <TextField label="Batting Style" value={battingStyle} onChange={(event) => setBattingStyle(event.target.value)} />
          <TextField label="Bowling Style" value={bowlingStyle} onChange={(event) => setBowlingStyle(event.target.value)} />
          <SelectField label="Status" value={status} onChange={(event) => setStatus(event.target.value as PlayerStatus)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
          <div className="flex gap-2">
            <Button disabled={createPlayer.isPending || updatePlayer.isPending}>{editingPlayer ? 'Save Player' : 'Add Player'}</Button>
            {editingPlayer ? (
              <Button type="button" variant="secondary" onClick={() => setEditingPlayer(null)}>
                Cancel
              </Button>
            ) : null}
          </div>
          <MutationStatus error={createPlayer.error || updatePlayer.error} success={createPlayer.isSuccess || updatePlayer.isSuccess ? 'Player saved.' : null} />
        </form>
      </PagePanel>

      <PagePanel title="Player List">
        {isLoading ? <p>Loading players...</p> : null}
        <div className="grid gap-3">
          {players.map((player) => (
            <article key={player.id} className="grid gap-3 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-3">
                <CircularAvatar src={player.photo_url} alt={player.display_name} size="lg" onClick={player.photo_url ? () => avatarViewer.open(player.photo_url!, player.display_name) : undefined} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{player.display_name}</h3>
                  <p className="text-sm text-slate-500">{player.status}</p>
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                className="max-w-full text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadPhoto.mutateAsync({ playerId: player.id, file });
                }}
              />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditingPlayer(player)}>
                  Edit
                </Button>
                <Button type="button" variant="danger" onClick={() => void removePlayer(player.id)}>
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
        <MutationStatus error={deletePlayer.error || uploadPhoto.error} success={uploadPhoto.isSuccess ? 'Photo uploaded.' : null} />
      </PagePanel>
    </div>
  );
}
