import { create } from 'zustand'

const useScreenshareStore = create((set, get) => ({
  // State
  myId: '',
  peerId: '',
  isConnected: false,
  isViewer: false,  // true if we're viewing someone else's screen
  peerConnection: null,
  stream: null,
  videoRef: null,

  // Actions
  setMyId: (id) => set({ myId: id }),
  setPeerId: (id) => set({ peerId: id }),
  setIsConnected: (status) => set({ isConnected: status }),
  setIsViewer: (status) => set({ isViewer: status }),
  setPeerConnection: (pc) => set({ peerConnection: pc }),
  setStream: (stream) => set({ stream }),
  setVideoRef: (ref) => {
    console.log('Setting video ref:', ref)
    set({ videoRef: ref })
  },

  // WebRTC actions
  createPeerConnection: (onIceCandidate, onTrack, onConnectionStateChange) => {
    console.log('Creating peer connection')
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

    set({ peerConnection: pc })
    return pc
  },

  cleanup: () => {
    console.log('Cleaning up WebRTC connections')
    const { peerConnection, stream } = get()
    if (peerConnection) {
      peerConnection.close()
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
  }
}))

export default useScreenshareStore 