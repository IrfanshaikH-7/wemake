const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 3001 })

const peers = new Map()

// Log all connected peers
function logPeers() {
  console.log('\nCurrent connected peers:')
  peers.forEach((ws, id) => {
    console.log(`- ${id}`)
  })
  console.log('')
}

wss.on('connection', (ws) => {
  let peerId = null

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)
      console.log('\nReceived message:', {
        type: data.type,
        sender: data.sender || peerId,
        target: data.target,
        data: data.data
      })

      switch (data.type) {
        case 'register':
          peerId = data.peerId
          peers.set(peerId, ws)
          console.log(`Peer ${peerId} registered`)
          logPeers()
          break

        case 'request':
        case 'accept':
        case 'decline':
        case 'offer':
        case 'answer':
        case 'ice-candidate':
        case 'control-request':
        case 'control-approved':
        case 'control-denied':
          const targetPeer = peers.get(data.target)
          if (targetPeer) {
            console.log(`Forwarding ${data.type} message from ${data.sender || peerId} to ${data.target}`)
            targetPeer.send(JSON.stringify({
              ...data,
              sender: peerId
            }))
          } else {
            console.log(`Target peer ${data.target} not found. Available peers:`, Array.from(peers.keys()))
          }
          break

        default:
          console.log('Unknown message type:', data.type)
      }
    } catch (error) {
      console.error('Error processing message:', error)
    }
  })

  ws.on('close', () => {
    if (peerId) {
      console.log(`Peer ${peerId} disconnected`)
      peers.delete(peerId)
      logPeers()
    }
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

console.log('Signaling server running on port 3001') 