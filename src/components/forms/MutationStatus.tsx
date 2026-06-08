interface MutationStatusProps {
  error?: unknown;
  success?: string | null;
}

export function MutationStatus({ error, success }: MutationStatusProps) {
  if (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong.';
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
  }

  if (success) {
    return <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-700">{success}</p>;
  }

  return null;
}
