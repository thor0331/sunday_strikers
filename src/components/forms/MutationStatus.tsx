interface MutationStatusProps {
  error?: unknown;
  success?: string | null;
}

export function MutationStatus({ error, success }: MutationStatusProps) {
  if (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong.';
    return <p className="rounded-md bg-red-950 border border-red-700 px-3 py-2 text-sm text-red-200">{message}</p>;
  }

  if (success) {
    return <p className="rounded-md bg-emerald-950 border border-emerald-700 px-3 py-2 text-sm text-emerald-200">{success}</p>;
  }

  return null;
}
