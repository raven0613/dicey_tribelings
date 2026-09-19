import { app, net, protocol } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { desktopConfig } from './config';

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-src 'none'",
].join('; ');

export function registerDesktopScheme() {
  protocol.registerSchemesAsPrivileged([{
    scheme: desktopConfig.scheme,
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  }]);
}

export function handleDesktopResources() {
  const webDirectory = path.join(app.getAppPath(), 'web');

  protocol.handle(desktopConfig.scheme, async (request) => {
    const url = new URL(request.url);
    if (url.host !== desktopConfig.host || request.method !== 'GET') {
      return new Response('Not found', { status: 404 });
    }

    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response('Invalid path', { status: 400 });
    }

    const filePath = path.resolve(webDirectory, `.${pathname === '/' ? '/index.html' : pathname}`);
    const relativePath = path.relative(webDirectory, filePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const response = await net.fetch(pathToFileURL(filePath).href);
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', contentSecurityPolicy);
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}
