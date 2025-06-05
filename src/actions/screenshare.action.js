import { toast } from 'sonner'
import useScreenshareStore from '../store/screenshareStore'

export const createPeerConnection = (onIceCandidate, onTrack, onConnectionStateChange) => {
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  }

  const pc = new RTCPeerConnection(configuration)

  pc.onicecandidate = onIceCandidate
  pc.ontrack = onTrack
  pc.onconnectionstatechange = onConnectionStateChange

  return pc
}

export const handleOffer = async (sender, offer, wsRef) => {
  const store = useScreenshareStore.getState()
  console.log('handleOffer - store state:', { 
    videoRef: store.videoRef,
    peerId: store.peerId,
    isConnected: store.isConnected 
  })

  const pc = store.createPeerConnection(
    (event) => {
      if (event.candidate) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          target: store.peerId,
          data: event.candidate
        }))
      }
    },
    (event) => {
      if (store.videoRef?.current) {
        console.log('Setting video stream to video element')
        store.videoRef.current.srcObject = event.streams[0]
      } else {
        console.error('Video ref not available')
      }
    },
    () => {
      console.log('Connection state:', pc.connectionState)
      if (pc.connectionState === 'connected') {
        store.setIsConnected(true)
      }
    }
  )

  try {
    console.log('Getting screen sources...')
    const sources = await window.electronAPI.getSources()
    console.log('Available sources:', sources)

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
    console.log('Got media stream:', stream)

    stream.getVideoTracks()[0].onended = () => {
      console.log('Screen share ended')
      store.setIsConnected(false)
      if (pc) {
        pc.close()
      }
    }

    store.setStream(stream)

    stream.getTracks().forEach(track => {
      console.log('Adding track to peer connection:', track.kind)
      pc.addTrack(track, stream)
    })

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    console.log('Set remote description')

    if (pc.pendingCandidates) {
      for (const candidate of pc.pendingCandidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
      pc.pendingCandidates = []
    }

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    console.log('Created and set local answer')

    wsRef.current.send(JSON.stringify({
      type: 'answer',
      target: sender,
      data: answer
    }))

    return { pc, stream }
  } catch (err) {
    console.error('Error in handleOffer:', err)
    throw err
  }
}

export const handleAnswer = async (answer) => {
  const store = useScreenshareStore.getState()
  console.log('handleAnswer - store state:', { 
    peerConnection: store.peerConnection,
    isConnected: store.isConnected 
  })

  try {
    await store.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    console.log('Set remote description in handleAnswer')

    if (store.peerConnection.pendingCandidates) {
      for (const candidate of store.peerConnection.pendingCandidates) {
        await store.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      }
      store.peerConnection.pendingCandidates = []
    }
  } catch (err) {
    console.error('Error in handleAnswer:', err)
    throw err
  }
}

export const handleIceCandidate = async (candidate) => {
  const store = useScreenshareStore.getState()
  console.log('handleIceCandidate - store state:', { 
    peerConnection: store.peerConnection,
    hasRemoteDescription: store.peerConnection?.remoteDescription 
  })

  try {
    if (store.peerConnection && store.peerConnection.remoteDescription) {
      await store.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      console.log('Added ICE candidate')
    } else {
      if (!store.peerConnection.pendingCandidates) {
        store.peerConnection.pendingCandidates = []
      }
      store.peerConnection.pendingCandidates.push(candidate)
      console.log('Stored pending ICE candidate')
    }
  } catch (err) {
    console.error('Error in handleIceCandidate:', err)
    throw err
  }
}

export const connectToPeer = async (wsRef) => {
  const store = useScreenshareStore.getState()
  console.log("connectToPeer - store state:", { 
    peerId: store.peerId,
    videoRef: store.videoRef,
    isConnected: store.isConnected 
  })

  try {
    const pc = store.createPeerConnection(
      (event) => {
        if (event.candidate) {
          wsRef.current.send(JSON.stringify({
            type: 'ice-candidate',
            target: store.peerId,
            data: event.candidate
          }))
        }
      },
      (event) => {
        if (store.videoRef?.current) {
          console.log('Setting video stream to video element in connectToPeer')
          store.videoRef.current.srcObject = event.streams[0]
        } else {
          console.error('Video ref not available in connectToPeer')
        }
      },
      () => {
        console.log('Connection state in connectToPeer:', pc.connectionState)
        if (pc.connectionState === 'connected') {
          store.setIsConnected(true)
        }
      }
    )

    const offer = await pc.createOffer({
      offerToReceiveVideo: true
    })
    await pc.setLocalDescription(offer)
    console.log('Created and set local offer')

    wsRef.current.send(JSON.stringify({
      type: 'offer',
      target: store.peerId,
      data: offer
    }))

    store.setIsConnected(true)
    return pc
  } catch (err) {
    console.error('Error in connectToPeer:', err)
    store.setIsConnected(false)
    throw err
  }
}

export const handleWebSocketMessage = async (event, wsRef) => {
  const store = useScreenshareStore.getState()
  const message = JSON.parse(event.data)
  console.log('WebSocket message received:', message)
  
  switch (message.type) {
    case 'offer':
      console.log('Handling offer message')
      const { pc, stream } = await handleOffer(message.sender, message.data, wsRef)
      store.setPeerConnection(pc)
      store.setStream(stream)
      return { pc, stream }
    case 'answer':
      console.log('Handling answer message')
      await handleAnswer(message.data)
      break
    case 'ice-candidate':
      console.log('Handling ICE candidate message')
      await handleIceCandidate(message.data)
      break
    case 'request':
      console.log('Got request from:', message.sender)
      toast.info(`${message.sender} wants to connect`, {
        action: {
          label: 'accept',
          onClick: () => {
            console.log('Sending accept to:', message.sender)
            wsRef.current.send(JSON.stringify({
              type: 'accept',
              target: message.sender
            }))
          }
        },
        cancel: {
          label: 'decline',
          onClick: () => {
            console.log('Sending decline to:', message.sender)
            wsRef.current.send(JSON.stringify({
              type: 'decline',
              target: message.sender
            }))
          }
        }
      })
      break
    case 'accept':
      console.log('Got accept from:', message.sender)
      console.log('Current peerId:', store.peerId)
      await connectToPeer(wsRef)
      break
    case 'decline':
      console.log('Got decline from:', message.sender)
      break
  }
}
