const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Escucha en todas las interfaces de red para permitir dispositivos externos

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon'
};

// Obtener IP local en la red Wi-Fi / LAN
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const https = require('https');

let publicTunnelUrl = null;
let tunnelProcesses = [];

function verifyAndSetPublicUrl(candidateUrl) {
  if (!candidateUrl || candidateUrl === publicTunnelUrl) return;
  const req = https.get(candidateUrl, { timeout: 6000 }, (res) => {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      if (publicTunnelUrl !== candidateUrl) {
        publicTunnelUrl = candidateUrl;
        console.log(`✅ URL PÚBLICA VERIFICADA (HTTP ${res.statusCode}): ${publicTunnelUrl}`);
      }
    } else {
      console.log(`⚠️ URL candidata ${candidateUrl} devolvió HTTP ${res.statusCode}`);
    }
    res.resume();
  });
  req.on('error', (err) => {
    console.log(`⚠️ No se pudo conectar desde esta red a ${candidateUrl}: ${err.message}`);
  });
  req.on('timeout', () => {
    req.destroy();
  });
}

function spawnSshTunnel(name, args, urlRegex) {
  try {
    const proc = spawn('ssh', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    tunnelProcesses.push(proc);

    const handleOutput = (chunk) => {
      const text = chunk.toString();
      const matches = text.match(urlRegex);
      if (matches && matches.length > 0) {
        for (const m of matches) {
          console.log(`[${name}] URL detectada: ${m}`);
          verifyAndSetPublicUrl(m);
        }
      }
    };

    proc.stdout.on('data', handleOutput);
    proc.stderr.on('data', handleOutput);
    proc.on('error', () => {});
  } catch (e) {}
}

function startPublicTunnel() {
  // 1. Pinggy (Puerto 443 HTTPS, evita bloqueos de ISP en puerto 22/DNS)
  spawnSshTunnel(
    'pinggy',
    [
      '-p', '443',
      '-T',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=20',
      '-R', `0:127.0.0.1:${PORT}`,
      'qr@a.pinggy.io'
    ],
    /https:\/\/[a-zA-Z0-9.-]+\.pinggy\.link/g
  );

  // 2. Serveo (HTTPS público directo)
  spawnSshTunnel(
    'serveo',
    [
      '-T',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=20',
      '-R', `80:127.0.0.1:${PORT}`,
      'serveo.net'
    ],
    /https:\/\/[a-zA-Z0-9.-]+\.serveousercontent\.com/g
  );

  // 3. Localhost.run (Respaldo adicional)
  spawnSshTunnel(
    'lhr',
    [
      '-T',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=20',
      '-R', `80:127.0.0.1:${PORT}`,
      'nokey@localhost.run'
    ],
    /https:\/\/[a-zA-Z0-9.-]+\.lhr\.life/g
  );
}

// =========================================================================
// SALAS ONLINE (WebSocket RFC6455 Nativo + HTTP Polling Fallback)
// =========================================================================
const rooms = new Map(); // roomCode -> { wsClients: Set<{socket, role}>, queueHost: [], queueGuest: [], updatedAt: number }

function getOrCreateRoom(code) {
  const cleanCode = String(code || '').toUpperCase().trim().slice(0, 12);
  if (!rooms.has(cleanCode)) {
    rooms.set(cleanCode, {
      wsClients: new Set(),
      queueHost: [],
      queueGuest: [],
      updatedAt: Date.now()
    });
  }
  const r = rooms.get(cleanCode);
  r.updatedAt = Date.now();
  return r;
}

// Limpieza periódica de salas inactivas
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.wsClients.size === 0 && now - room.updatedAt > 10 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}, 60 * 1000);

function encodeWsFrame(str) {
  const payload = Buffer.from(str, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function relayRoomMessage(code, senderRole, rawObj) {
  const room = getOrCreateRoom(code);
  const serialized = JSON.stringify(rawObj);
  const frame = encodeWsFrame(serialized);

  // Enviar por WebSocket a los demás clientes de la sala
  for (const client of room.wsClients) {
    if (client.role !== senderRole && !client.socket.destroyed) {
      try {
        client.socket.write(frame);
      } catch (e) {}
    }
  }

  // Guardar también en cola HTTP para dispositivos que usen HTTP polling
  const targetQueue = senderRole === 'host' ? room.queueGuest : room.queueHost;
  if (rawObj.type === 'GAME_MSG' && rawObj.payload && rawObj.payload.type === 'STATE_SYNC') {
    // Reemplazar STATE_SYNC anterior para evitar acumular estados viejos
    for (let i = targetQueue.length - 1; i >= 0; i--) {
      if (targetQueue[i].type === 'GAME_MSG' && targetQueue[i].payload?.type === 'STATE_SYNC') {
        targetQueue.splice(i, 1);
      }
    }
  }
  targetQueue.push(rawObj);
  if (targetQueue.length > 40) {
    targetQueue.splice(0, targetQueue.length - 40);
  }
}

const server = http.createServer((req, res) => {
  // Cabeceras CORS para permitir conexión desde cualquier dispositivo externo
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const cleanUrl = parsedUrl.pathname;

  // Endpoint con las URLs públicas y locales para abrir en celulares/tablets
  if (cleanUrl === '/api/server-info') {
    const ips = getLocalIPs();
    const lanUrls = ips.map((ip) => `http://${ip}:${PORT}`);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(
      JSON.stringify({
        port: PORT,
        lanUrls,
        primaryLanUrl: lanUrls[0] || `http://localhost:${PORT}`,
        publicUrl: publicTunnelUrl
      })
    );
  }

  // Endpoint HTTP Relay para Salas Online (fallback universal para cualquier red móvil/proxy)
  if (cleanUrl === '/api/room') {
    const code = parsedUrl.searchParams.get('room') || '';
    const role = parsedUrl.searchParams.get('role') || 'guest';
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Falta código de sala' }));
    }

    const room = getOrCreateRoom(code);

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 250000) req.destroy();
      });
      req.on('end', () => {
        try {
          const msg = JSON.parse(body);
          relayRoomMessage(code, role, msg);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(400);
          res.end('Bad JSON');
        }
      });
      return;
    }

    if (req.method === 'GET') {
      const myQueue = role === 'host' ? room.queueHost : room.queueGuest;
      const messages = myQueue.splice(0, myQueue.length);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ messages }));
    }
  }

  const relPath = cleanUrl === '/' ? '/index.html' : cleanUrl;
  const filePath = path.join(__dirname, relPath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end('Archivo no encontrado');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
});

// Upgrade a WebSocket nativo en /ws?room=XXXX&role=host|guest
server.on('upgrade', (req, socket) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (parsedUrl.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
    );

    const code = (parsedUrl.searchParams.get('room') || 'DEFAULT').toUpperCase().trim();
    const role = parsedUrl.searchParams.get('role') || 'guest';
    const room = getOrCreateRoom(code);
    const clientRef = { socket, role };
    room.wsClients.add(clientRef);

    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 2) {
        const firstByte = buffer[0];
        const opcode = firstByte & 0x0f;
        const secondByte = buffer[1];
        const isMasked = (secondByte & 0x80) !== 0;
        let payloadLen = secondByte & 0x7f;
        let offset = 2;

        if (payloadLen === 126) {
          if (buffer.length < 4) return;
          payloadLen = buffer.readUInt16BE(2);
          offset = 4;
        } else if (payloadLen === 127) {
          if (buffer.length < 10) return;
          payloadLen = Number(buffer.readBigUInt64BE(2));
          offset = 10;
        }

        const maskLen = isMasked ? 4 : 0;
        if (buffer.length < offset + maskLen + payloadLen) return;

        const mask = isMasked ? buffer.slice(offset, offset + 4) : null;
        offset += maskLen;
        const payload = Buffer.from(buffer.slice(offset, offset + payloadLen));
        buffer = buffer.slice(offset + payloadLen);

        if (opcode === 0x8) {
          // Close frame
          room.wsClients.delete(clientRef);
          socket.end();
          return;
        }

        if (opcode === 0x1) {
          if (isMasked && mask) {
            for (let i = 0; i < payload.length; i++) {
              payload[i] ^= mask[i % 4];
            }
          }
          try {
            const msg = JSON.parse(payload.toString('utf8'));
            relayRoomMessage(code, role, msg);
          } catch (e) {}
        }
      }
    });

    const cleanupSocket = () => {
      room.wsClients.delete(clientRef);
    };
    socket.on('close', cleanupSocket);
    socket.on('error', cleanupSocket);
    socket.on('end', cleanupSocket);
  } catch (e) {
    try {
      socket.destroy();
    } catch (err) {}
  }
});

server.listen(PORT, () => {
  const ips = getLocalIPs();
  console.log(`=============================================================`);
  console.log(`🎮 Burguer y Vaquito: El Juego corriendo en:`);
  console.log(`   💻 En esta PC:          http://localhost:${PORT}`);
  ips.forEach((ip) => {
    console.log(`   📱 En Wi-Fi / Red Local: http://${ip}:${PORT}`);
  });
  console.log(`=============================================================`);
  startPublicTunnel();
});
