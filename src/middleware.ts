import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|terraviva-logo.png|manifest.webmanifest|sw.js|pwa-icon|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
