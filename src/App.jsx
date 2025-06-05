import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import './App.css'
import { handleWebSocketMessage } from './actions/screenshare.action'
import useScreenshareStore from './store/screenshareStore'

function App() {
  const wsRef = useRef()
  const videoRef = useRef()
  
  const {
    myId,
    peerId,
    isConnected,
    isViewer,
    setMyId,
    setPeerId,
    setVideoRef,
    setIsViewer,
    cleanup
  } = useScreenshareStore()

  useEffect(() => {
    // Generate a unique ID for this peer
    const id = uuidv4()
    setMyId(id)
    setVideoRef(videoRef)

    // Connect to signaling server
    const ws = new WebSocket('ws://localhost:3001')
    wsRef.current = ws

    ws.onopen = () => {
      // Register with the signaling server
      ws.send(JSON.stringify({
        type: 'register',
        peerId: id
      }))
    }

    ws.onmessage = async (event) => {
      await handleWebSocketMessage(event, wsRef)
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      cleanup()
    }
  }, [])

  const handleConnectClick = () => {
    console.log('Sending request to:', peerId)
    setIsViewer(true) // We're the viewer when we initiate the connection
    wsRef.current.send(JSON.stringify({
      type: 'request',
      target: peerId,
      data: { type: 'request' } 
    }))
  }

  const handleRequestControl = () => {
    console.log('Requesting control from:', peerId)
    console.log('Current state:', {
      myId,
      peerId,
      isConnected,
      isViewer
    })
    wsRef.current.send(JSON.stringify({
      type: 'control-request',
      sender: myId,
      target: peerId
    }))
  }

  return (
    <div className="container">
      <div className="info">
        <p>Your ID: {myId}</p>
        <div className="connect-form">
          <input
            type="text"
            value={peerId}
            onChange={(e) => setPeerId(e.target.value)}
            placeholder="Enter peer ID to connect"
          />
          <button onClick={handleConnectClick} disabled={!peerId || isConnected}>
            Connect
          </button>
        </div>
      </div>

      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: '100%', height: '100vh' }}
        />
        {isConnected && isViewer && (
          <button
            onClick={handleRequestControl}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 1000,
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Request Control
          </button>
        )}
      </div>
    </div>
  )
}

export default App
