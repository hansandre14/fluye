import { defineMiddleware } from 'astro:middleware';
import { currentUser } from './server/auth.js';

const PROTECTED_PAGES = new Set(['/dashboard', '/registro', '/movimientos', '/acceso-verificado']);
const DYNAMIC_PAGES = new Set(['/', '/recuperar', '/restablecer', ...PROTECTED_PAGES]);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (PROTECTED_PAGES.has(pathname) || pathname === '/') {
    context.locals.user = await currentUser(context);
    if (PROTECTED_PAGES.has(pathname) && !context.locals.user) {
      return context.redirect('/');
    }
    if (pathname === '/' && context.locals.user) {
      return context.redirect('/dashboard');
    }
  }
  const response = await next();
  if (DYNAMIC_PAGES.has(pathname) && !response.headers.has('Cache-Control')) {
    response.headers.set('Cache-Control', 'no-store');
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
});
