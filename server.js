/**
 * RUTA//CTRL — servidor local
 * ---------------------------------------------------------
 * Este servidor hace dos cosas:
 *   1) Sirve la web (carpeta /public) en http://localhost:3000
 *   2) Hace de puente con Supabase: el navegador nunca llama
 *      directamente a Supabase, siempre pasa por aquí. Así se
 *      evitan los problemas de CORS / file:// / claves visibles
 *      en el navegador.
 *
 * CÓMO USARLO:
 *   1. Instala Node.js si no lo tienes: https://nodejs.org (LTS)
 *   2. Abre una terminal en esta carpeta
 *   3. Ejecuta:  node server.js
 *   4. Abre en el navegador:  http://localhost:3000
 *
 * No hace falta "npm install", no usa ninguna librería externa.
 * ---------------------------------------------------------
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// ======= TUS CREDENCIALES DE SUPABASE =======
// Cámbialas aquí si algún día rotas la clave o cambias de proyecto.
const SUPABASE_URL = 'https://lirflipqomvxyrymocsi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcmZsaXBxb212eHlyeW1vY3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MTc4MzcsImV4cCI6MjA0ODI5NzgzN30.4KMEM0JZ3Jw3eM2n1TQtKRfKcB0eJnU1hJ2K5rX9L6Y';
// =============================================

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

// ---- Puente hacia Supabase (todo lo que llega a /api/...) ----
function proxyToSupabase(req, res, supaPath) {
  let chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const rawBody = Buffer.concat(chunks).toString('utf8');
    try {
      const headers = {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
      };
      // Las claves JWT clásicas (anon, empiezan por "eyJ") necesitan
      // también ir en Authorization. Las nuevas (sb_publishable_/sb_secret_)
      // NO deben ir ahí.
      if (SUPABASE_KEY.startsWith('eyJ')) {
        headers.Authorization = 'Bearer ' + SUPABASE_KEY;
      }
      if (req.method !== 'GET' && req.method !== 'DELETE') {
        headers.Prefer = 'return=representation';
      }

      const url = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + supaPath;
      const resp = await fetch(url, {
        method: req.method,
        headers,
        body: req.method === 'GET' || req.method === 'DELETE' ? undefined : rawBody,
      });

      const text = await resp.text();
      res.writeHead(resp.status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(text || '{}');
    } catch (err) {
      sendJSON(res, 502, {
        message:
          'El servidor local no ha podido conectar con Supabase (' + err.message + '). ' +
          'Comprueba que el proyecto no esté en pausa y que tengas conexión a internet.',
      });
    }
  });
}

// ---- Servir archivos estáticos de /public ----
function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(PUBLIC_DIR, decodeURIComponent(urlPath));

  // Evita salir de la carpeta public (seguridad básica)
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Prohibido');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('No encontrado: ' + urlPath);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    proxyToSupabase(req, res, req.url.replace('/api/', ''));
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  RUTA//CTRL corriendo en http://localhost:' + PORT);
  console.log('  Pulsa Ctrl+C para detenerlo.');
  console.log('');
});
