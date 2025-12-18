import { RTCIceCandidate, RTCPeerConnection, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';

const configuration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
    {
      urls: 'stun:stun1.l.google.com:19302',
    },
  ],
};

// For live streaming: broadcaster sends to multiple viewers
let broadcasterPeerConnection: RTCPeerConnection | null = null;
let broadcasterStream: any = null;

// For viewers: each viewer connects to broadcaster
let viewerPeerConnections: Record<string, RTCPeerConnection> = {};
let viewerStreams: Record<string, any> = {};

// Callback functions to be set by the live screen
let onIceCandidateCallback: ((candidate: any) => void) | null = null;

export const setIceCandidateCallback = (callback: (candidate: any) => void) => {
  onIceCandidateCallback = callback;
};

export const initializeBroadcaster = async () => {
  try {
    console.log('Creating RTCPeerConnection...');
    broadcasterPeerConnection = new RTCPeerConnection(configuration);
    console.log('RTCPeerConnection created successfully');

    // Set up event handlers immediately
    (broadcasterPeerConnection as any).onicecandidate = (event: any) => {
      if (event.candidate && onIceCandidateCallback) {
        onIceCandidateCallback(event.candidate);
      }
    };

    // Note: Not enumerating devices to avoid PC closure issues
    const isFront = true;

    const facingMode = isFront ? 'user' : 'environment';

    const constraints = {
      audio: true,
      video: {
        width: { ideal: 720 },
        height: { ideal: 1280 },
        frameRate: { ideal: 30 },
        facingMode,
      },
    };

    console.log('Requesting user media with constraints:', constraints);
    const stream = await mediaDevices.getUserMedia(constraints);
    console.log('User media obtained, tracks:', stream.getTracks().length);

    broadcasterStream = stream;

    // Add tracks to peer connection
    console.log('Adding tracks to peer connection...');
    stream.getTracks().forEach((track: any) => {
      console.log('Adding track:', track.kind);
      broadcasterPeerConnection?.addTrack(track, stream);
    });

    console.log('Broadcaster initialized successfully');
    return { peerConnection: broadcasterPeerConnection, stream };
  } catch (error) {
    console.error('Failed to initialize broadcaster:', error);
    // Cleanup on error
    if (broadcasterPeerConnection) {
      broadcasterPeerConnection.close();
      broadcasterPeerConnection = null;
    }
    if (broadcasterStream) {
      broadcasterStream.getTracks().forEach((track: any) => track.stop());
      broadcasterStream = null;
    }
    throw error;
  }
};

export const createBroadcastOffer = async () => {
  if (!broadcasterPeerConnection || (broadcasterPeerConnection as any).connectionState === 'closed') throw new Error('Broadcaster not initialized');

  const offer = await broadcasterPeerConnection.createOffer();
  await broadcasterPeerConnection.setLocalDescription(offer);
  return offer;
};

export const initializeViewer = async (viewerId: string) => {
  const peerConnection = new RTCPeerConnection(configuration);
  viewerPeerConnections[viewerId] = peerConnection;

  (peerConnection as any).onaddstream = (event: any) => {
    viewerStreams[viewerId] = event.stream;
  };

  return peerConnection;
};

export const createViewerAnswer = async (viewerId: string, offer: RTCSessionDescription) => {
  const peerConnection = viewerPeerConnections[viewerId];
  if (!peerConnection) throw new Error('Viewer not initialized');

  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  return answer;
};

export const handleViewerAnswer = async (viewerId: string, answer: RTCSessionDescription) => {
  if (!broadcasterPeerConnection || (broadcasterPeerConnection as any).connectionState === 'closed') throw new Error('Broadcaster not initialized');

  await broadcasterPeerConnection.setRemoteDescription(answer);
};

export const addIceCandidateToBroadcaster = async (candidate: RTCIceCandidate) => {
  if (!broadcasterPeerConnection || (broadcasterPeerConnection as any).connectionState === 'closed') throw new Error('Broadcaster not initialized');

  await broadcasterPeerConnection.addIceCandidate(candidate);
};

export const addIceCandidateToViewer = async (viewerId: string, candidate: RTCIceCandidate) => {
  const peerConnection = viewerPeerConnections[viewerId];
  if (!peerConnection) throw new Error('Viewer not initialized');

  await peerConnection.addIceCandidate(candidate);
};

export const getBroadcasterStream = () => broadcasterStream;
export const getViewerStream = (viewerId: string) => viewerStreams[viewerId];

export const closeBroadcaster = () => {
  if (broadcasterPeerConnection) {
    broadcasterPeerConnection.close();
    broadcasterPeerConnection = null;
  }
  if (broadcasterStream) {
    broadcasterStream.getTracks().forEach((track: any) => track.stop());
    broadcasterStream = null;
  }
};

export const closeViewer = (viewerId: string) => {
  const peerConnection = viewerPeerConnections[viewerId];
  if (peerConnection) {
    peerConnection.close();
    delete viewerPeerConnections[viewerId];
  }
  delete viewerStreams[viewerId];
};

export const closeAllConnections = () => {
  closeBroadcaster();
  Object.keys(viewerPeerConnections).forEach(closeViewer);
};
