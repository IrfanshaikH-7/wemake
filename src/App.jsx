import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import './App.css'

function App() {
  const [myId, setMyId] = useState('')
  const [peerId, setPeerId] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef()
  const peerConnectionRef = useRef()
  const videoRef = useRef()
  const streamRef = useRef()

  useEffect(() => {
    // Generate a unique ID for this peer
    const id = uuidv4()
    setMyId(id)

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
      const message = JSON.parse(event.data)

      switch (message.type) {
        case 'offer':
          await handleOffer(message.sender, message.data)
          break
        case 'answer':
          await handleAnswer(message.data)
          break
        case 'ice-candidate':
          await handleIceCandidate(message.data)
          break
      }
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    }

    const pc = new RTCPeerConnection(configuration)
    peerConnectionRef.current = pc

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          target: peerId,
          data: event.candidate
        }))
      }
    }

    pc.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0]
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState)
      if (pc.connectionState === 'connected') {
        setIsConnected(true)
      }
    }

    return pc
  }

  const handleOffer = async (sender, offer) => {
    const pc = createPeerConnection()
    
    try {
      // Get available sources using the exposed API
      const sources = await window.electronAPI.getSources()

      // Create a stream from the selected source
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sources[0].id,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
            minFrameRate: 30,
            maxFrameRate: 60
          }
        }
      })

      // Handle stream end
      stream.getVideoTracks()[0].onended = () => {
        setIsConnected(false)
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close()
        }
      }

      streamRef.current = stream

      // Add the stream tracks to the peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      
      // Add any pending ICE candidates
      if (pc.pendingCandidates) {
        for (const candidate of pc.pendingCandidates) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        }
        pc.pendingCandidates = []
      }

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      wsRef.current.send(JSON.stringify({
        type: 'answer',
        target: sender,
        data: answer
      }))
    } catch (err) {
      console.error('Error handling offer:', err)
    }
  }

  const handleAnswer = async (answer) => {
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
      
      // Add any pending ICE candidates
      if (peerConnectionRef.current.pendingCandidates) {
        for (const candidate of peerConnectionRef.current.pendingCandidates) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        }
        peerConnectionRef.current.pendingCandidates = []
      }
    } catch (err) {
      console.error('Error handling answer:', err)
    }
  }

  const handleIceCandidate = async (candidate) => {
    try {
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      } else {
        // Store the candidate to add later when we have a remote description
        if (!peerConnectionRef.current.pendingCandidates) {
          peerConnectionRef.current.pendingCandidates = []
        }
        peerConnectionRef.current.pendingCandidates.push(candidate)
      }
    } catch (err) {
      console.error('Error handling ICE candidate:', err)
    }
  }

  const connectToPeer = async () => {
    try {
      const pc = createPeerConnection()
      
      // Create an offer to receive video
      const offer = await pc.createOffer({
        offerToReceiveVideo: true
      })
      await pc.setLocalDescription(offer)

      wsRef.current.send(JSON.stringify({
        type: 'offer',
        target: peerId,
        data: offer
      }))

      setIsConnected(true)
    } catch (err) {
      console.error('Error connecting:', err)
      setIsConnected(false)
    }
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
          <button onClick={connectToPeer} disabled={!peerId || isConnected}>
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
      </div>
    </div>
  )
}

export default App
