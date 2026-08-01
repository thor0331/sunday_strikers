import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { TextField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { useSignIn } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const signIn = useSignIn();
  const { lastEmail, setLastEmail } = useAuthStore();
  const [email, setEmail] = useState(lastEmail);
  const [password, setPassword] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    await signIn.mutateAsync({ email, password });
    setLastEmail(email);
    navigate('/admin');
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-transparent px-4 py-10">
      <PagePanel title="Admin Login">
        <form className="grid gap-3" onSubmit={submit}>
          <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <Button disabled={signIn.isPending}>Login</Button>
          <MutationStatus error={signIn.error} />
        </form>
      </PagePanel>
    </main>
  );
}
