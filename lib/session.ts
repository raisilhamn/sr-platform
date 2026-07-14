import { cookies } from 'next/headers';

const SESSION_COOKIE = 'cpns_sr_session';

export async function getSessionId(): Promise<string> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) throw new Error('missing session cookie');
  return id;
}
