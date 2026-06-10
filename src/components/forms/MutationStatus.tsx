interface MutationStatusProps {
  error?: unknown;
  success?: string | null;
}

export function MutationStatus({ error, success }: MutationStatusProps) {
  if (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong.';
    return <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{message}</p>;
  }

  if (success) {
    return <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">{success}</p>;
  }

  return null;
}
