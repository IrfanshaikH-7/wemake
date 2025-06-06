import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import './App.css'
import { handleWebSocketMessage } from './actions/screenshare.action'
import useScreenshareStore from './store/screenshareStore'
import ControlHandler from './components/core/ControlHandler'
import { logo } from './assets'
function App() {
  const wsRef = useRef()
  const videoRef = useRef()
  const [isWeMenuOpen, setIsWeMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
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

  const handleCopy = (myId)=>
  {
    try {
    navigator.clipboard.writeText(myId)
    setCopied(true)
  } catch (error) {
    
  }finally{
    setTimeout(() => {
      setCopied(false)
    }, 1500);
  }
  }

  return (
    <>


      <div className="absolute top-4 left-4 w-auto z-[999]">
        <div onClick={() => setIsWeMenuOpen((prev) => !prev)} className='h-12 w-12 relative rounded-lg overflow-hidden cursor-pointer'>
          <img src={logo} className='h-full w-full absolute' />
        </div>
        {
          isWeMenuOpen && (
            <section className='py-1 rounded-lg w-full '>
              <div className=' py-4 px-2 bg-black border border-neutral-700 rounded-lg'>
              
                
              <div className='pt-1 pb-2 flex gap-2'>
              <p className='text-xs italic '><b>PeerID</b> :{myId}</p>
              <div className='relative h-4 w-4 cursor-pointer relative'
              onClick={() => handleCopy(myId)}>
                {
                copied && (<div className='absolute py-1 px-4 -top-8 text-xs  -translate-x-1/2 right-50% bg-black rounded-full'>copied</div>)
              }
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M16 12.9V17.1C16 20.6 14.6 22 11.1 22H6.9C3.4 22 2 20.6 2 17.1V12.9C2 9.4 3.4 8 6.9 8H11.1C14.6 8 16 9.4 16 12.9Z" fill="#ffffff"></path> <path opacity="0.4" d="M17.0998 2H12.8998C9.44976 2 8.04977 3.37 8.00977 6.75H11.0998C15.2998 6.75 17.2498 8.7 17.2498 12.9V15.99C20.6298 15.95 21.9998 14.55 21.9998 11.1V6.9C21.9998 3.4 20.5998 2 17.0998 2Z" fill="#ffffff"></path> </g></svg></div>
              </div>
                <div className="flex gap-1 w-full">
                  <input
                    type="text"
                    value={peerId}
                    className=' w-80 max-w-96'
                    onChange={(e) => setPeerId(e.target.value)}
                    placeholder="Enter peer ID to connect"
                  />
                  <button className='bg-blue-300 rounded-lg px-4 text-black font-medium' onClick={handleConnectClick} disabled={!peerId || isConnected}>
                    Connect
                  </button>
                </div>
                { isConnected && isViewer && (
              <button
                onClick={handleRequestControl}
                className='py-2 px-4 cursor-pointer rounded-lg bg-blue-300 mt-2 w-full text-black font-medium'
              >
                Request Control
              </button>
            )}
              
              </div>

            </section>


          )
        }

      </div>

      <div className=" h-fit  rounded-lg w-fit overflow-hidden">
        {isConnected && isViewer && (
          <>
            <video
              className='border-2 rounded-lg border-red-200'
              ref={videoRef}
              autoPlay
              playsInline
            />
           
            <ControlHandler />
          </>
        )}
      </div>
    </>
  )
}

export default App
