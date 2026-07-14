import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'cpns_sr_session';
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
    path: '/',
    maxAge: TEN_YEARS,
    sameSite: 'lax',
  });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
