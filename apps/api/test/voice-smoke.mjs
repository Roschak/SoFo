/**
 * Voice chat signaling E2E — two users join a meeting voice room and exchange
 * SDP/ICE through the server relay (PRD §41, Discord-style in-app calls).
 * Usage: BASE_URL=... WS_URL=... node test/voice-smoke.mjs   (server must be live)
 */

import { io } from 'socket.io-client';
import {
  BASE_URL,
  createChecker,
  apiCall,
  registerAndLogin,
} from './helpers/http-api.mjs';

const WS_URL = process.env.WS_URL ?? 'http://localhost:4001';
const { check, summary } = createChecker();
const unique = Date.now();

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(WS_URL, { auth: { token }, transports: ['websocket'] });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (error) => reject(error));
    setTimeout(() => reject(new Error('connect timeout')), 5000);
  });
}

function waitFor(socket, event, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function main() {
  console.log(`\nVoice signaling E2E → ${BASE_URL} (WS ${WS_URL})`);

  const host = await registerAndLogin(`voice-host-${unique}@sofo.test`);
  const guest = await registerAndLogin(`voice-guest-${unique}@sofo.test`);

  const ws = await apiCall('POST', '/workspaces', {
    token: host.token,
    body: { name: `Voice ${unique}`, mode: 'ENTERPRISE' },
  });
  const workspaceId = ws.data.id;
  await apiCall('POST', `/workspaces/${workspaceId}/members`, {
    token: host.token,
    workspaceId,
    body: { userId: guest.userId, roleName: 'MEMBER' },
  });

  const meeting = await apiCall('POST', `/workspaces/${workspaceId}/meetings`, {
    token: host.token,
    workspaceId,
    body: { title: 'Voice test', scheduledAt: new Date(unique + 3600_000).toISOString() },
  });
  const meetingId = meeting.data.id;
  await apiCall('POST', `/workspaces/${workspaceId}/meetings/${meetingId}/start`, {
    token: host.token,
    workspaceId,
  });

  const hostSocket = await connect(host.token);
  const guestSocket = await connect(guest.token);

  console.log('\n=== 1. VOICE JOIN ===');
  // Broadcast hanya menjangkau anggota voice room — host sendiri yang
  // menerima event participants saat join pertama (guest belum di room).
  const hostJoinPromise = waitFor(hostSocket, 'voice.participants');
  const hostJoin = await hostSocket.emitWithAck('voice.join', { workspaceId, meetingId });
  check('host voice.join OK + menerima daftar', hostJoin.code === 'OK');
  const hostEvent = await hostJoinPromise;
  check(
    'host menerima voice.participants berisi dirinya',
    hostEvent.participants.some((p) => p.userId === host.userId),
    JSON.stringify(hostEvent.participants),
  );
  check(
    'participant punya socketId + displayName',
    hostEvent.participants.every((p) => typeof p.socketId === 'string' && p.displayName),
  );

  const guestJoinPromise = waitFor(hostSocket, 'voice.participants');
  const guestJoin = await guestSocket.emitWithAck('voice.join', { workspaceId, meetingId });
  check('guest voice.join OK', guestJoin.code === 'OK');
  const guestEvent = await guestJoinPromise;
  check(
    'host melihat 2 peserta',
    guestEvent.participants.length === 2,
    JSON.stringify(guestEvent.participants),
  );

  console.log('\n=== 2. MUTE / CAMERA STATE ===');
  const mutePromise = waitFor(hostSocket, 'voice.participants');
  await guestSocket.emitWithAck('voice.mute', { workspaceId, meetingId, muted: true });
  const mutedEvent = await mutePromise;
  const guestEntry = mutedEvent.participants.find((p) => p.userId === guest.userId);
  check('guest mute ter-broadcast', guestEntry?.muted === true, JSON.stringify(guestEntry));

  const camPromise = waitFor(hostSocket, 'voice.participants');
  await guestSocket.emitWithAck('voice.camera', { workspaceId, meetingId, cameraOn: true });
  const camEvent = await camPromise;
  const guestCam = camEvent.participants.find((p) => p.userId === guest.userId);
  check('guest camera-on ter-broadcast', guestCam?.cameraOn === true);

  console.log('\n=== 3. SDP RELAY (terarah per socket) ===');
  const hostSocketId = hostSocket.id;
  const sdpPromise = waitFor(hostSocket, 'voice.sdp');
  const relay = await guestSocket.emitWithAck('voice.sdp', {
    workspaceId,
    meetingId,
    targetSocketId: hostSocketId,
    sdp: 'v=0 fake-offer-for-relay-test',
    type: 'offer',
  });
  check('voice.sdp ack OK', relay.code === 'OK');
  const sdpEvent = await sdpPromise;
  check(
    'host menerima offer relay dari guest',
    sdpEvent.fromSocketId === guestSocket.id && sdpEvent.type === 'offer',
    JSON.stringify(sdpEvent),
  );

  const icePromise = waitFor(hostSocket, 'voice.ice');
  const iceRelay = await guestSocket.emitWithAck('voice.ice', {
    workspaceId,
    meetingId,
    targetSocketId: hostSocketId,
    candidate: 'candidate:1 1 UDP 2130706431 192.168.68.107 4001 typ host',
    sdpMid: '0',
    sdpMLineIndex: 0,
  });
  check('voice.ice ack OK', iceRelay.code === 'OK');
  const iceEvent = await icePromise;
  check('host menerima ICE candidate', iceEvent.fromSocketId === guestSocket.id && iceEvent.candidate.includes('typ host'));

  console.log('\n=== 4. SECURITY — outsider + bukan peserta voice ===');
  const outsider = await registerAndLogin(`voice-out-${unique}@sofo.test`);
  const outsiderSocket = await connect(outsider.token);
  const outsiderJoin = await outsiderSocket.emitWithAck('voice.join', { workspaceId, meetingId });
  check('outsider voice.join DITOLAK (bukan member)', outsiderJoin.code === 'FORBIDDEN');

  const thirdMember = await registerAndLogin(`voice-third-${unique}@sofo.test`);
  await apiCall('POST', `/workspaces/${workspaceId}/members`, {
    token: host.token,
    workspaceId,
    body: { userId: thirdMember.userId, roleName: 'MEMBER' },
  });
  const thirdSocket = await connect(thirdMember.token);
  await thirdSocket.emitWithAck('workspace.join', { workspaceId });
  const thirdSdp = await thirdSocket.emitWithAck('voice.sdp', {
    workspaceId,
    meetingId,
    targetSocketId: hostSocketId,
    sdp: 'v=0 sneaky',
    type: 'offer',
  });
  check('member yang belum join voice DITOLAK relay SDP', thirdSdp.code === 'FORBIDDEN');

  console.log('\n=== 5. LEAVE + DISCONNECT CLEANUP ===');
  const leftPromise = waitFor(hostSocket, 'voice.left');
  await guestSocket.emitWithAck('voice.leave', { workspaceId, meetingId });
  const leftEvent = await leftPromise;
  check('voice.left ter-broadcast saat leave', leftEvent.socketId === guestSocket.id);

  const disconnectPromise = waitFor(hostSocket, 'voice.left');
  // Guest reconnects then hard-disconnects — server must drop the participant.
  const guest2 = await connect(guest.token);
  await guest2.emitWithAck('voice.join', { workspaceId, meetingId });
  const guest2SocketId = guest2.id; // id becomes undefined after disconnect()
  guest2.disconnect();
  const disconnectEvent = await disconnectPromise;
  check(
    'disconnect memicu voice.left (cleanup otomatis)',
    disconnectEvent.socketId === guest2SocketId,
    JSON.stringify(disconnectEvent),
  );

  hostSocket.disconnect();
  guestSocket.disconnect();
  outsiderSocket.disconnect();
  thirdSocket.disconnect();
  process.exit(summary() ? 0 : 1);
}

main().catch((error) => {
  console.error('Voice smoke crashed:', error.message);
  process.exit(1);
});
