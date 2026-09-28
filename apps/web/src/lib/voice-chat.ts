/**
 * WebRTC voice chat for in-app meetings (Discord-style voice, Zoom-lite).
 *
 * Topology: full mesh — every participant connects peer-to-peer to every other
 * participant. Right-sized for the beta (2–5 people on one LAN); a TURN/SFU
 * stage is the documented next step for larger calls (see session notes).
 *
 * Signaling rides the existing authenticated Socket.IO connection:
 *   client → server: voice.join / voice.leave / voice.mute / voice.camera
 *   server → client: voice.participants / voice.sdp / voice.ice / voice.left
 *
 * Negotiation rule (deterministic, no glare): when the participant list is
 * refreshed, a peer initiates an offer only to sockets whose socketId is
 * lexicographically GREATER than its own. Exactly one side of every pair
 * offers; the other side answers. No polite/impolite rollback needed.
 */

import type {
  VoiceIcePayload,
  VoiceJoinPayload,
  VoiceParticipant,
  VoiceSdpPayload,
} from '@sofo/shared';
import {
  bindVoiceHandlers,
  emitVoiceCamera,
  emitVoiceIce,
  emitVoiceJoin,
  emitVoiceLeave,
  emitVoiceMute,
  emitVoiceSdp,
} from './socket';
import type { Socket } from 'socket.io-client';

export interface VoicePeer {
  socketId: string;
  userId: string;
  displayName: string;
  muted: boolean;
  cameraOn: boolean;
  connection: RTCPeerConnection | null;
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
}

export interface VoiceChatState {
  inCall: boolean;
  selfSocketId: string;
  selfMuted: boolean;
  selfCameraOn: boolean;
  micError: string | null;
  peers: VoicePeer[];
}

type Listener = () => void;

export class VoiceChat {
  private socket: Socket;
  private workspaceId = '';
  private meetingId: string | null = null;
  private localStream: MediaStream | null = null;
  private peers = new Map<string, VoicePeer>();
  private listeners = new Set<Listener>();
  private unbind: (() => void) | null = null;
  /** Guard against double-join races while awaiting getUserMedia. */
  private joining = false;

  state: VoiceChatState = {
    inCall: false,
    selfSocketId: '',
    selfMuted: false,
    selfCameraOn: false,
    micError: null,
    peers: [],
  };

  constructor(socket: Socket) {
    this.socket = socket;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.state = {
      inCall: this.state.inCall,
      selfSocketId: this.socket.id ?? '',
      selfMuted: this.state.selfMuted,
      selfCameraOn: this.state.selfCameraOn,
      micError: this.state.micError,
      peers: [...this.peers.values()].map((peer) => ({ ...peer })),
    };
    for (const listener of this.listeners) listener();
  }

  /**
   * Request mic (and optionally camera) then join the meeting voice room.
   * Must be called from a user gesture (browser autoplay/mic policy).
   */
  async join(workspaceId: string, meetingId: string, withCamera: boolean): Promise<void> {
    if (this.state.inCall || this.joining) return;
    this.workspaceId = workspaceId;
    this.joining = true;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: withCamera ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
    } catch (cause) {
      this.state.micError = cause instanceof Error ? cause.message : 'Mic/kamera tidak tersedia';
      this.notify();
      this.joining = false;
      return;
    }

    this.meetingId = meetingId;
    this.state.inCall = true;
    this.state.micError = null;
    this.state.selfMuted = false;
    this.state.selfCameraOn = withCamera;
    this.bindSocket();
    const payload: VoiceJoinPayload = { workspaceId, meetingId };
    emitVoiceJoin(this.socket, payload);
    this.notify();
    this.joining = false;
  }

  async leave(): Promise<void> {
    if (!this.meetingId) return;
    const payload: VoiceJoinPayload = { workspaceId: this.workspaceId, meetingId: this.meetingId };
    emitVoiceLeave(this.socket, payload);
    this.teardown();
  }

  toggleMute(): void {
    if (!this.localStream) return;
    const enable = this.state.selfMuted;
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = enable;
    }
    this.state.selfMuted = !enable;
    this.emitState();
  }

  /** Turn the camera track on/off; fetches a camera lazily when joined audio-only. */
  async toggleCamera(): Promise<void> {
    if (!this.meetingId) return;
    if (!this.state.selfCameraOn) {
      const hasVideoTrack = (this.localStream?.getVideoTracks().length ?? 0) > 0;
      if (!hasVideoTrack) {
        try {
          const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const track = cameraStream.getVideoTracks()[0];
          if (!track || !this.localStream) return;
          this.localStream.addTrack(track);
          for (const peer of this.peers.values()) {
            peer.connection?.addTrack(track, this.localStream);
          }
        } catch {
          return; // no camera available — state unchanged
        }
      } else {
        for (const track of this.localStream?.getVideoTracks() ?? []) {
          track.enabled = true;
        }
      }
    } else {
      for (const track of this.localStream?.getVideoTracks() ?? []) {
        track.enabled = false;
      }
    }
    this.state.selfCameraOn = !this.state.selfCameraOn;
    this.emitState();
  }

  /** Local preview source for a <video> element (null when audio-only). */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /** Update the workspace used by leave/mute/camera events (e.g. after reload). */
  setWorkspaceId(workspaceId: string): void {
    this.workspaceId = workspaceId;
  }

  private emitState(): void {
    if (!this.meetingId) return;
    const payload: VoiceJoinPayload = { workspaceId: this.workspaceId, meetingId: this.meetingId };
    emitVoiceMute(this.socket, { ...payload, muted: this.state.selfMuted });
    emitVoiceCamera(this.socket, { ...payload, cameraOn: this.state.selfCameraOn });
  }

  private bindSocket(): void {
    if (this.unbind) this.unbind();

    const onParticipants = (event: {
      workspaceId: string;
      meetingId: string;
      participants: readonly VoiceParticipant[];
    }) => {
      if (event.meetingId !== this.meetingId) return;
      void this.syncParticipants(event.participants);
    };
    const onSdp = (event: { fromSocketId: string; sdp: string; type: 'offer' | 'answer' }) => {
      void this.handleSdp(event.fromSocketId, event.sdp, event.type);
    };
    const onIce = (event: {
      fromSocketId: string;
      candidate: string;
      sdpMid: string | null;
      sdpMLineIndex: number | null;
    }) => {
      void this.handleIce(event.fromSocketId, event.candidate, event.sdpMid, event.sdpMLineIndex);
    };
    const onLeft = (event: { socketId: string; meetingId: string }) => {
      if (event.meetingId !== this.meetingId) return;
      this.removePeer(event.socketId);
    };

    bindVoiceHandlers(this.socket, {
      onParticipants,
      onSdp,
      onIce,
      onLeft,
    });
    this.unbind = () => {
      this.socket.off('voice.participants', onParticipants);
      this.socket.off('voice.sdp', onSdp);
      this.socket.off('voice.ice', onIce);
      this.socket.off('voice.left', onLeft);
    };
  }

  /**
   * Reconcile the peer map against the authoritative participant list, then
   * offer to every new peer with a greater socketId (deterministic initiator).
   */
  private async syncParticipants(participants: readonly VoiceParticipant[]): Promise<void> {
    const selfId = this.socket.id ?? '';
    const alive = new Set<string>();

    for (const participant of participants) {
      if (participant.socketId === selfId) continue;
      alive.add(participant.socketId);

      const peer = this.ensurePeer(participant.socketId);
      peer.userId = participant.userId;
      peer.displayName = participant.displayName;
      peer.muted = participant.muted;
      peer.cameraOn = participant.cameraOn;

      if (!peer.connection && selfId < participant.socketId) {
        await this.offerTo(participant.socketId);
      }
    }

    for (const socketId of [...this.peers.keys()]) {
      if (!alive.has(socketId)) this.removePeer(socketId);
    }
    this.notify();
  }

  private ensurePeer(socketId: string): VoicePeer {
    let peer = this.peers.get(socketId);
    if (peer) return peer;
    peer = {
      socketId,
      userId: '',
      displayName: 'Peserta',
      muted: false,
      cameraOn: false,
      connection: null,
      stream: null,
      connectionState: 'new',
    };
    this.peers.set(socketId, peer);
    return peer;
  }

  private createConnection(socketId: string): RTCPeerConnection {
    const peer = this.ensurePeer(socketId);
    if (peer.connection) return peer.connection;

    // STUN only helps across subnets; same-LAN calls connect via host
    // candidates. A TURN server is the documented next stage (beta guide).
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peer.connection = connection;

    for (const track of this.localStream?.getTracks() ?? []) {
      connection.addTrack(track, this.localStream!);
    }

    connection.ontrack = (event) => {
      peer.stream = event.streams[0] ?? new MediaStream([event.track]);
      this.notify();
    };
    connection.onicecandidate = (event) => {
      if (!event.candidate || !this.meetingId) return;
      const payload: VoiceIcePayload = {
        workspaceId: this.workspaceId,
        meetingId: this.meetingId,
        targetSocketId: socketId,
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
      };
      emitVoiceIce(this.socket, payload);
    };
    connection.onconnectionstatechange = () => {
      peer.connectionState = connection.connectionState;
      this.notify();
    };

    return connection;
  }

  private async offerTo(socketId: string): Promise<void> {
    if (!this.meetingId) return;
    const connection = this.createConnection(socketId);
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    if (!connection.localDescription) return;
    const payload: VoiceSdpPayload = {
      workspaceId: this.workspaceId,
      meetingId: this.meetingId,
      targetSocketId: socketId,
      sdp: connection.localDescription.sdp,
      type: 'offer',
    };
    emitVoiceSdp(this.socket, payload);
  }

  private async handleSdp(
    fromSocketId: string,
    sdp: string,
    type: 'offer' | 'answer',
  ): Promise<void> {
    if (!this.meetingId || fromSocketId === this.socket.id) return;

    if (type === 'offer') {
      const connection = this.createConnection(fromSocketId);
      await connection.setRemoteDescription({ type: 'offer', sdp });
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      if (!connection.localDescription) return;
      const payload: VoiceSdpPayload = {
        workspaceId: this.workspaceId,
        meetingId: this.meetingId,
        targetSocketId: fromSocketId,
        sdp: connection.localDescription.sdp,
        type: 'answer',
      };
      emitVoiceSdp(this.socket, payload);
      this.notify();
      return;
    }

    // Answer: only meaningful while we have a local offer pending.
    const peer = this.peers.get(fromSocketId);
    if (peer?.connection && peer.connection.signalingState === 'have-local-offer') {
      await peer.connection.setRemoteDescription({ type: 'answer', sdp });
      this.notify();
    }
  }

  private async handleIce(
    fromSocketId: string,
    candidate: string,
    sdpMid: string | null,
    sdpMLineIndex: number | null,
  ): Promise<void> {
    if (!this.meetingId || fromSocketId === this.socket.id) return;
    const peer = this.peers.get(fromSocketId);
    if (!peer?.connection) return;
    try {
      await peer.connection.addIceCandidate({ candidate, sdpMid, sdpMLineIndex });
    } catch {
      // A candidate can outrun its remote description on flaky links; the
      // browser discards unusable ones — safe to ignore (PRD §33 idempotency).
    }
  }

  private removePeer(socketId: string): void {
    const peer = this.peers.get(socketId);
    if (!peer) return;
    peer.connection?.close();
    this.peers.delete(socketId);
    this.notify();
  }

  private teardown(): void {
    for (const peer of this.peers.values()) {
      peer.connection?.close();
    }
    this.peers.clear();
    for (const track of this.localStream?.getTracks() ?? []) {
      track.stop();
    }
    this.localStream = null;
    this.unbind?.();
    this.unbind = null;
    this.meetingId = null;
    this.state.inCall = false;
    this.state.selfMuted = false;
    this.state.selfCameraOn = false;
    this.notify();
  }
}
