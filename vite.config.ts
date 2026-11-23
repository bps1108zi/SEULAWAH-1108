import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'SEULAWAH - Sistem Ekonomi Unggulan dan Layanan Analisis Wilayah Aceh Besar',
          short_name: 'SEULAWAH',
          description: 'SEULAWAH (Sistem Ekonomi Unggulan dan Layanan Analisis Wilayah Aceh Besar) - BPS Kabupaten Aceh Besar',
          theme_color: '#032b69',
          background_color: '#032b69',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      configureServer(server: any) {
        server.middlewares.use('/api/ai-analyze', async (req: any, res: any) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const { prompt, analysisType, contextData } = data;

              const apiKey = process.env.GEMINI_API_KEY;
              if (!apiKey) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  source: 'local-expert',
                  insight: 'API Key belum diset di panel Secrets. Sistem menggunakan sintesis ekonomi riil BPS Aceh Besar.'
                }));
                return;
              }

              const { GoogleGenAI } = await import('@google/genai');
              const ai = new GoogleGenAI({ apiKey });

              const systemInstruction = `Kamu adalah Ahli Analisis Perekonomian Regional dan Statistisi Senior di Badan Pusat Statistik (BPS) Kabupaten Aceh Besar.
Analisis yang kamu berikan harus bernilai tambah tinggi, tajam, ringkas, ilmiah, dan mencerminkan FENOMENA RIIL DI KABUPATEN ACEH BESAR (misalnya: keberadaan Bandara SIM Blang Bintang, Pasar Induk Lambaro Ingin Jaya, Pabrik Semen SBA di Lhoknga, kawasan lumbung padi irigasi Krueng Aceh Indrapuri-Montasik, kawasan pendidikan Darussalam, dan tantangan kepulauan Pulo Aceh). Berikan analisis deskriptif nilai ekstrim dan insight solusi konkret bagi perencana daerah Bappeda Aceh Besar.`;

              const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `${systemInstruction}\n\nKonteks Data:\n${JSON.stringify(contextData)}\n\nInstruksi Analisis:\n${prompt}`,
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                source: 'gemini-ai',
                insight: response.text || 'Tidak ada respons dari AI.'
              }));
            } catch (err: any) {
              console.error('Error in /api/ai-analyze:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Gagal memproses AI' }));
            }
          });
        });
      },
    },
  };
});
