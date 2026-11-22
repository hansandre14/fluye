import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { publicOrigin } from './src/server/env.js';

const origin = publicOrigin();
const allowedDomains = [{ hostname: 'localhost', protocol: 'http' }, { hostname: '127.0.0.1', protocol: 'http' }];
if (origin?.protocol === 'https:') {
  allowedDomains.push({ hostname: origin.hostname, protocol: 'https', ...(origin.port ? { port: origin.port } : {}) });
}

export default defineConfig({
  output: 'server',
  server: { host: '127.0.0.1', port: 4321 },
  adapter: node({ mode: 'standalone', bodySizeLimit: 8192 }),
  vite: {
    plugins: [tailwindcss()],
  },
  security: { allowedDomains },
});
