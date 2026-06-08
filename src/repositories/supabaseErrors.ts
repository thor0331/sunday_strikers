export function requireData<T>(data: T | null, error: unknown): T {
  if (error) throw error;
  if (data === null) throw new Error('Supabase returned no data.');
  return data;
}

export function publicUrl(bucket: string, path: string, origin: string): string {
  return `${origin}/storage/v1/object/public/${bucket}/${path}`;
}
