// Sistema Multijugador Online para Dispositivos Externos (Celular, Tablet y PC):
// Combina 4 canales automáticos para garantizar conexión entre cualquier dispositivo:
// 1. PeerJS WebRTC P2P (Internet global directo entre dispositivos distintos)
// 2. WebSocket Nativo del Servidor (/ws)
// 3. HTTP Room Relay (/api/room) por si la red móvil bloquea WebSockets/WebRTC
// 4. BroadcastChannel (entre pestañas del mismo dispositivo)

class NetworkManager {
  constructor() {
    this.mode = 'local'; // 'local' | 'single' | 'online_host' | 'online_guest'
    this.roomCode = '';
    this.connected = false;
    this.peer = null;
    this.conn = null;
    this.bc = null;
    this.ws = null;
    this.httpPollTimer = null;
    this.helloRetryTimer = null;
    this.onConnectedCallback = null;
    this.onMessageCallback = null;
    this.onDisconnectedCallback = null;
  }

  setStatus(text, isReady = false) {
    const el = document.getElementById('online-status');
    if (el) {
      el.textContent = text;
      el.className = 'online-status ' + (isReady ? 'status-ready' : 'status-waiting');
    }
  }

  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  cleanup() {
    this.connected = false;
    if (this.helloRetryTimer) {
      clearInterval(this.helloRetryTimer);
      this.helloRetryTimer = null;
    }
    if (this.httpPollTimer) {
      clearInterval(this.httpPollTimer);
      this.httpPollTimer = null;
    }
    if (this.conn) {
      try {
        this.conn.close();
      } catch (e) {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
    if (this.bc) {
      try {
        this.bc.close();
      } catch (e) {}
      this.bc = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
  }

  handleIncomingEnvelope(msg, role, sourceLabel) {
    if (!msg || msg.sender === role) return;
    if (msg.type === 'HELLO_HOST' && role === 'host') {
      this.sendEnvelope({ sender: 'host', type: 'WELCOME_GUEST' });
      this.markConnected(`¡Jugador 2 conectado desde otro dispositivo (${sourceLabel})!`);
    } else if (msg.type === 'WELCOME_GUEST' && role === 'guest') {
      this.markConnected(`¡Unido a la sala [${this.roomCode}]! Esperando que J1 inicie...`);
    } else if (msg.type === 'GAME_MSG') {
      if (!this.connected) {
        this.markConnected(`¡Conectado en vivo a la sala [${this.roomCode}]!`);
      }
      if (this.onMessageCallback) {
        this.onMessageCallback(msg.payload);
      }
    }
  }

  sendEnvelope(envelope) {
    // 1. BroadcastChannel
    if (this.bc) {
      try {
        this.bc.postMessage(envelope);
      } catch (e) {}
    }

    // 2. WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(envelope));
      } catch (e) {}
    }

    // 3. HTTP Relay (si el WebSocket no está abierto aún o estamos en túnel HTTP)
    if (location.protocol.startsWith('http') && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
      const role = this.mode === 'online_host' ? 'host' : 'guest';
      fetch(`/api/room?room=${encodeURIComponent(this.roomCode)}&role=${role}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope)
      }).catch(() => {});
    }
  }

  setupAllTransports(code, role) {
    // 1. Canal local entre pestañas
    if ('BroadcastChannel' in window) {
      this.bc = new BroadcastChannel(`bv_room_${code}`);
      this.bc.onmessage = (ev) => {
        this.handleIncomingEnvelope(ev.data, role, 'Pestaña');
      };
    }

    // 2. WebSocket directo con el servidor
    if (location.protocol.startsWith('http')) {
      try {
        const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProto}//${location.host}/ws?room=${encodeURIComponent(code)}&role=${role}`;
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          this.ws = ws;
          if (role === 'guest') {
            this.sendEnvelope({ sender: 'guest', type: 'HELLO_HOST' });
          }
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            this.handleIncomingEnvelope(msg, role, 'Servidor Online');
          } catch (err) {}
        };
      } catch (e) {}

      // 3. HTTP Polling de respaldo (para redes móviles / proxies que bloquean WS)
      this.httpPollTimer = setInterval(() => {
        if (this.mode !== 'online_host' && this.mode !== 'online_guest') return;
        fetch(`/api/room?room=${encodeURIComponent(code)}&role=${role}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && Array.isArray(data.messages)) {
              for (const msg of data.messages) {
                this.handleIncomingEnvelope(msg, role, 'Red Pública');
              }
            }
          })
          .catch(() => {});
      }, 120);
    }

    // Si es invitado (Jugador 2), anuncia su entrada periódicamente hasta conectar
    if (role === 'guest') {
      this.sendEnvelope({ sender: 'guest', type: 'HELLO_HOST' });
      this.helloRetryTimer = setInterval(() => {
        if (this.connected || this.mode !== 'online_guest') {
          clearInterval(this.helloRetryTimer);
          this.helloRetryTimer = null;
          return;
        }
        this.sendEnvelope({ sender: 'guest', type: 'HELLO_HOST' });
      }, 650);
    }
  }

  markConnected(msgText) {
    if (this.connected) return;
    this.connected = true;
    this.setStatus(msgText, true);
    if (this.onConnectedCallback) {
      this.onConnectedCallback();
    }
  }

  hostRoom(customCode = '') {
    this.cleanup();
    this.mode = 'online_host';
    this.roomCode = (customCode || this.generateCode()).toUpperCase().trim();
    this.setStatus(
      `✅ Sala creada: [${this.roomCode}] — En el otro dispositivo escribe "${this.roomCode}" y toca "UNIRSE A SALA"`,
      false
    );

    this.setupAllTransports(this.roomCode, 'host');

    if (window.Peer) {
      try {
        const peerId = `burguer-vaquito-p2p-${this.roomCode}`;
        this.peer = new Peer(peerId);
        this.peer.on('connection', (conn) => {
          this.conn = conn;
          conn.on('open', () => {
            this.markConnected(`¡Jugador 2 conectado online a la sala [${this.roomCode}]!`);
          });
          conn.on('data', (data) => {
            if (this.onMessageCallback) this.onMessageCallback(data);
          });
          conn.on('close', () => {
            this.connected = false;
            this.setStatus('El Jugador 2 se desconectó.', false);
            if (this.onDisconnectedCallback) this.onDisconnectedCallback();
          });
        });
        this.peer.on('error', () => {});
      } catch (e) {}
    }
    return this.roomCode;
  }

  joinRoom(code) {
    this.cleanup();
    this.mode = 'online_guest';
    this.roomCode = code.toUpperCase().trim();
    this.setStatus(`🔍 Conectando a la sala [${this.roomCode}]...`, false);

    this.setupAllTransports(this.roomCode, 'guest');

    if (window.Peer) {
      try {
        this.peer = new Peer();
        this.peer.on('open', () => {
          const targetId = `burguer-vaquito-p2p-${this.roomCode}`;
          const conn = this.peer.connect(targetId, { reliable: true });
          this.conn = conn;
          conn.on('open', () => {
            this.markConnected(`¡Conectado online a la sala [${this.roomCode}]! Esperando inicio...`);
          });
          conn.on('data', (data) => {
            if (this.onMessageCallback) this.onMessageCallback(data);
          });
          conn.on('close', () => {
            this.connected = false;
            this.setStatus('Se perdió la conexión con el Anfitrión.', false);
            if (this.onDisconnectedCallback) this.onDisconnectedCallback();
          });
        });
        this.peer.on('error', () => {});
      } catch (e) {}
    }
  }

  send(payload) {
    if (!this.connected && payload?.type !== 'START_ONLINE_MATCH') return;
    const role = this.mode === 'online_host' ? 'host' : 'guest';
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(payload);
      } catch (e) {}
    }
    this.sendEnvelope({ sender: role, type: 'GAME_MSG', payload });
  }
}

window.networkManager = new NetworkManager();
