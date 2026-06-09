export interface PostgrestError {
  message: string;
  details: string;
  hint: string;
  code: string;
}

export function isPostgrestError(error: any): error is PostgrestError {
  return error && typeof error === 'object' && ('message' in error || 'code' in error);
}

export function parseSupabaseError(error: unknown): Error {
  if (!error) return new Error('Unknown error');
  
  // Log the full Supabase error object in detail to the console
  console.error('Supabase error occurred:', error);
  
  if (isPostgrestError(error)) {
    const details = error.details ? ` Details: ${error.details}` : '';
    const hint = error.hint ? ` Hint: ${error.hint}` : '';
    const code = error.code ? ` [Code: ${error.code}]` : '';
    return new Error(`${error.message || 'Database error'}${details}${hint}${code}`);
  }
  
  return error instanceof Error ? error : new Error(String(error));
}

export function requireData<T>(data: T | null, error: unknown): T {
  if (error) {
    throw parseSupabaseError(error);
  }
  if (data === null) {
    throw new Error('Supabase returned no data.');
  }
  return data;
}

export function publicUrl(bucket: string, path: string, origin: string): string {
  return `${origin}/storage/v1/object/public/${bucket}/${path}`;
}
