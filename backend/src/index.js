const express = require('express');
const { createServer } = require('http');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

// Store connected peers
const peers = new Map();

// WebSocket server for signaling
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', (ws) => {
  let peerId = null;

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'register':
        peerId = data.peerId;
        peers.set(peerId, ws);
        console.log('Peer registered:', peerId);
        break;

      case 'offer':
      case 'answer':
      case 'ice-candidate':
        const targetPeer = peers.get(data.target);
        if (targetPeer) {
          targetPeer.send(JSON.stringify({
            type: data.type,
            sender: peerId,
            data: data.data
          }));
        }
        break;
    }
  });

  ws.on('close', () => {
    if (peerId) {
      peers.delete(peerId);
      console.log('Peer disconnected:', peerId);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
}); 