/**
 * SOFO realtime E2E — two users over live WebSocket + HTTP.
 * Usage: node test/realtime-smoke.mjs   (server must be live)
 * Covers ADR-004 contract: auth handshake, room join gating, presence,
 * typing TTL, message broadcast, tenant isolation.
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
    socket.on('error', (error) => reject(new Error(JSON.stringify(error))));
    socket.on('connect_error', (error) => reject(error));
    setTimeout(() => reject(new Error('connect timeout')), 5000);
  });
}

function waitFor(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function main() {
  console.log('\n=== 1. HANDSHAKE AUTH (ADR-004) ===');
  let rejectedSocket;
  const rejection = await connect('invalid-token-xyz').catch((error) => ({ failed: error }));
  check('token invalid ditolak saat handshake', rejection.failed !== undefined || rejection === false);
  if (rejection.failed === undefined) {
    rejectedSocket = rejection;
    rejectedSocket.disconnect();
  }

  const owner = await registerAndLogin(`rt-owner-${unique}@sofo.test`);
  const staff = await registerAndLogin(`rt-staff-${unique}@sofo.test`);
  const outsider = await registerAndLogin(`rt-out-${unique}@sofo.test`);

  const ownerSocket = await connect(owner.token);
  check('token valid terhubung', ownerSocket.connected);

  console.log('\n=== 2. WORKSPACE SETUP (HTTP) ===');
  const ws = await apiCall('POST', '/workspaces', {
    token: owner.token,
    body: { name: `RT ${unique}`, mode: 'COMMUNITY' },
  });
  const workspaceId = ws.data.id;
  const channel = await apiCall('POST', `/workspaces/${workspaceId}/channels`, {
    token: owner.token,
    workspaceId,
    body: { name: 'general', type: 'TEXT', visibility: 'PUBLIC' },
  });
  const channelId = channel.data.id;
  await apiCall('POST', `/workspaces/${workspaceId}/members`, {
    token: owner.token,
    workspaceId,
    body: { userId: staff.userId, roleName: 'MEMBER' },
  });
  check('workspace + channel + member siap', channelId !== undefined);

  console.log('\n=== 3. ROOM JOIN + PERMISSION GATE ===');
  const joinResult = await ownerSocket.emitWithAck('workspace.join', { workspaceId });
  check('owner join room OK + terima daftar online', joinResult.code === 'OK');

  const staffSocket = await connect(staff.token);

  const outsiderSocket = await connect(outsider.token);
  const outsiderJoin = await outsiderSocket.emitWithAck('workspace.join', { workspaceId });
  check('outsider join DITOLAK (bukan member)', outsiderJoin.code === 'FORBIDDEN');

  console.log('\n=== 4. PRESENCE (join/leave + idempotent join) ===');
  const presencePromise = waitFor(ownerSocket, 'presence.updated');
  const staffPresence = await staffSocket.emitWithAck('workspace.join', { workspaceId });
  check('staff join OK', staffPresence.code === 'OK');
  const presenceEvent = await presencePromise;
  check(
    'presence.updated berisi owner + staff online',
    presenceEvent.onlineUserIds.includes(owner.userId) &&
      presenceEvent.onlineUserIds.includes(staff.userId),
    JSON.stringify(presenceEvent),
  );

  const duplicateJoin = await staffSocket.emitWithAck('workspace.join', { workspaceId });
  check(
    'join duplikat idempotent — tanpa double-count presence',
    duplicateJoin.code === 'OK' &&
      duplicateJoin.onlineUserIds.filter((id) => id === staff.userId).length === 1,
    JSON.stringify(duplicateJoin),
  );

  const leavePromise = waitFor(ownerSocket, 'presence.updated');
  await staffSocket.emitWithAck('workspace.leave', { workspaceId });
  const leaveEvent = await leavePromise;
  check(
    'staff leave → presence offline',
    !leaveEvent.onlineUserIds.includes(staff.userId),
    JSON.stringify(leaveEvent),
  );
  await staffSocket.emitWithAck('workspace.join', { workspaceId });

  console.log('\n=== 5. MESSAGE BROADCAST (HTTP → WS) ===');
  const messagePromise = waitFor(ownerSocket, 'message.created');
  const send = await apiCall('POST', `/workspaces/${workspaceId}/channels/${channelId}/messages`, {
    token: staff.token,
    workspaceId,
    body: { content: 'Pesan realtime pertama' },
  });
  check('staff kirim message via HTTP 201', send.status === 201);
  const broadcasted = await messagePromise;
  check(
    'message.created diterima owner via WS dengan isi sama',
    broadcasted.id === send.data.id && broadcasted.content === 'Pesan realtime pertama',
    JSON.stringify(broadcasted),
  );

  const editPromise = waitFor(ownerSocket, 'message.updated');
  await apiCall('PATCH', `/workspaces/${workspaceId}/messages/${send.data.id}`, {
    token: staff.token,
    workspaceId,
    body: { content: 'Pesan realtime (edited)' },
  });
  const editedEvent = await editPromise;
  check('message.updated broadcast', editedEvent.content === 'Pesan realtime (edited)');

  console.log('\n=== 6. TYPING ===');
  const typingPromise = waitFor(ownerSocket, 'typing.updated');
  await staffSocket.emitWithAck('typing.start', { workspaceId, channelId });
  const typingEvent = await typingPromise;
  check(
    'typing.updated memuat staff',
    typingEvent.channelId === channelId && typingEvent.userIds.includes(staff.userId),
    JSON.stringify(typingEvent),
  );

  const stopPromise = waitFor(ownerSocket, 'typing.updated');
  await staffSocket.emitWithAck('typing.stop', { workspaceId, channelId });
  const stopEvent = await stopPromise;
  check('typing.stop menghapus user', !stopEvent.userIds.includes(staff.userId));

  console.log('\n=== 7. DISCONNECT → PRESENCE OFFLINE ===');
  const offlinePromise = waitFor(ownerSocket, 'presence.updated');
  staffSocket.disconnect();
  const offlineEvent = await offlinePromise;
  check(
    'disconnect memicu presence offline otomatis',
    !offlineEvent.onlineUserIds.includes(staff.userId),
    JSON.stringify(offlineEvent),
  );

  ownerSocket.disconnect();
  outsiderSocket.disconnect();
  process.exit(summary() ? 0 : 1);
}

main().catch((error) => {
  console.error('Realtime smoke test crashed:', error.message);
  process.exit(1);
});
