/**
 * SOFO Beta flow E2E — mensimulasikan perjalanan tester (PRD §97, §138)
 * persis seperti skenario di docs/notes/06-BETA-PHASE26.md §5, dijalankan
 * terhadap server beta yang terjangkau tester (default: LAN owner, Opsi A).
 *
 * Usage:
 *   BASE_URL=http://192.168.68.107:4001/api/v1 WS_URL=http://192.168.68.107:4001 \
 *     node apps/api/test/beta-flow.mjs
 *
 * Tanpa env, dipakai http://localhost:4001 (mode owner).
 */

import { io } from 'socket.io-client';
import {
  BASE_URL,
  createChecker,
  apiCall,
  registerAndLogin,
  PASSWORD,
} from './helpers/http-api.mjs';

const WS_URL = process.env.WS_URL ?? 'http://localhost:4001';
const { check, summary } = createChecker();
const unique = Date.now();
const testerEmail = `beta-tester-${unique}@sofo.test`;
const friendEmail = `beta-friend-${unique}@sofo.test`;
const colleagueEmail = `beta-colleague-${unique}@sofo.test`;

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
  console.log(`\nBeta flow → ${BASE_URL} (WS ${WS_URL})`);

  console.log('\n=== 1. REGISTER + LOGIN (skenario §5.1) ===');
  const tester = await registerAndLogin(testerEmail);
  check('tester daftar + login sukses', Boolean(tester.token));
  const me = await apiCall('GET', '/users/me', { token: tester.token });
  check('profil /users/me terbaca', me.status === 200 && me.data.email === testerEmail);

  const friend = await registerAndLogin(friendEmail);
  check('teman (anggota kedua) daftar + login', Boolean(friend.token));

  const colleague = await registerAndLogin(colleagueEmail);
  check('kolega (anggota ketiga) daftar + login', Boolean(colleague.token));

  console.log('\n=== 2. BUAT WORKSPACE ENTERPRISE + COMMUNITY (skenario §5.2) ===');
  const entWs = await apiCall('POST', '/workspaces', {
    token: tester.token,
    body: { name: `Beta Ent ${unique}`, mode: 'ENTERPRISE' },
  });
  check('workspace ENTERPRISE dibuat', entWs.status === 201 && entWs.data.mode === 'ENTERPRISE');
  const workspaceId = entWs.data.id;

  const comWs = await apiCall('POST', '/workspaces', {
    token: tester.token,
    body: { name: `Beta Com ${unique}`, mode: 'COMMUNITY' },
  });
  check('workspace COMMUNITY dibuat', comWs.status === 201 && comWs.data.mode === 'COMMUNITY');

  console.log('\n=== 3. UNDANG ANGGOTA + BERI ROLE (skenario §5.3) ===');
  const invite = await apiCall('POST', `/workspaces/${workspaceId}/members`, {
    token: tester.token,
    workspaceId,
    body: { userId: friend.userId, roleName: 'MEMBER' },
  });
  check('teman diundang sebagai MEMBER', invite.status === 201 || invite.status === 200);

  // Invite API mengembalikan {success:true} — resolve memberId dari list members
  // (shape: { id, user: { id, ... }, role, joinedAt }).
  const members = await apiCall('GET', `/workspaces/${workspaceId}/members`, {
    token: tester.token,
    workspaceId,
  });
  const friendMember = (members.data ?? []).find((m) => m.user?.id === friend.userId);
  check('teman terdaftar di list members', Boolean(friendMember?.id), JSON.stringify(members.data));

  const promote = await apiCall('PATCH', `/workspaces/${workspaceId}/members/${friendMember.id}`, {
    token: tester.token,
    workspaceId,
    body: { roleName: 'MANAGER' },
  });
  check('role teman dinaikkan ke MANAGER', promote.status === 200, JSON.stringify(promote.data));

  // Kolega tetap MEMBER — pengaju request (request.create ada di STAFF/MEMBER,
  // bukan MANAGER — sesuai permission matrix PRD §25/§27).
  const inviteColleague = await apiCall('POST', `/workspaces/${workspaceId}/members`, {
    token: tester.token,
    workspaceId,
    body: { userId: colleague.userId, roleName: 'MEMBER' },
  });
  check('kolega diundang sebagai MEMBER', inviteColleague.status === 201 || inviteColleague.status === 200);

  console.log('\n=== 4. CHANNEL + CHAT REALTIME (skenario §5.4) ===');
  const channel = await apiCall('POST', `/workspaces/${workspaceId}/channels`, {
    token: tester.token,
    workspaceId,
    body: { name: 'general', type: 'TEXT', visibility: 'PUBLIC' },
  });
  check('channel dibuat', channel.status === 201);
  const channelId = channel.data.id;

  // Dua tester online bersamaan — persis kondisi beta (HP tester + HP teman).
  const testerSocket = await connect(tester.token);
  const friendSocket = await connect(friend.token);
  await testerSocket.emitWithAck('workspace.join', { workspaceId });
  await friendSocket.emitWithAck('workspace.join', { workspaceId });
  check('kedua tester join realtime room', testerSocket.connected && friendSocket.connected);

  const incoming = waitFor(friendSocket, 'message.created');
  const sent = await apiCall('POST', `/workspaces/${workspaceId}/channels/${channelId}/messages`, {
    token: tester.token,
    workspaceId,
    body: { content: 'Halo dari beta tester!' },
  });
  check('pesan terkirim 201', sent.status === 201);
  const broadcast = await incoming;
  check('teman menerima pesan realtime (isi identik)', broadcast.content === 'Halo dari beta tester!');

  const edited = waitFor(friendSocket, 'message.updated');
  await apiCall('PATCH', `/workspaces/${workspaceId}/messages/${sent.data.id}`, {
    token: tester.token,
    workspaceId,
    body: { content: 'Halo dari beta tester! (edit)' },
  });
  const editedEvent = await edited;
  check('edit pesan ter-broadcast realtime', editedEvent.content.endsWith('(edit)'));

  const reply = await apiCall('POST', `/workspaces/${workspaceId}/channels/${channelId}/messages`, {
    token: friend.token,
    workspaceId,
    body: { content: 'Reply dari teman', replyToId: sent.data.id },
  });
  check('thread reply 201', reply.status === 201 && reply.data.replyToId === sent.data.id);

  const deleteAck = waitFor(testerSocket, 'message.deleted');
  await apiCall('DELETE', `/workspaces/${workspaceId}/messages/${reply.data.id}`, {
    token: friend.token,
    workspaceId,
  });
  const deleteEvent = await deleteAck;
  // Shape MessageDeletedEvent: { messageId, channelId }.
  check('hapus pesan sendiri ter-broadcast', deleteEvent.messageId === reply.data.id);

  console.log('\n=== 5. FILE ≤25MB (skenario §5.5) ===');
  const formData = new FormData();
  formData.append('file', new Blob(['dokumen beta tester'], { type: 'text/plain' }), 'beta.txt');
  const upload = await fetch(`${BASE_URL}/workspaces/${workspaceId}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${friend.token}`, 'x-workspace-id': workspaceId },
    body: formData,
  });
  const uploaded = await upload.json();
  check('upload file 201', upload.status === 201 && uploaded.fileName === 'beta.txt');

  const download = await fetch(`${BASE_URL}/workspaces/${workspaceId}/files/${uploaded.id}`, {
    headers: { Authorization: `Bearer ${tester.token}`, 'x-workspace-id': workspaceId },
  });
  check('download file + isi sama', download.status === 200 && (await download.text()) === 'dokumen beta tester');

  console.log('\n=== 6. MEETING + LIVE NOTES (skenario §5.6) ===');
  const meeting = await apiCall('POST', `/workspaces/${workspaceId}/meetings`, {
    token: tester.token,
    workspaceId,
    body: { title: 'Kickoff Beta', scheduledAt: new Date(unique + 3600_000).toISOString() },
  });
  check('meeting dibuat', meeting.status === 201);
  const meetingId = meeting.data.id;

  const meetingStart = await apiCall('POST', `/workspaces/${workspaceId}/meetings/${meetingId}/start`, {
    token: tester.token,
    workspaceId,
  });
  check('meeting dimulai', meetingStart.status === 200 || meetingStart.status === 201);

  // Live note hanya untuk participant/host (meeting.service.upsertNote) —
  // friend join meeting dulu, persis alur UI tester ("Ikut" → tulis catatan).
  const joinMeeting = await apiCall('POST', `/workspaces/${workspaceId}/meetings/${meetingId}/join`, {
    token: friend.token,
    workspaceId,
  });
  check('teman ikut meeting (participant)', joinMeeting.status === 200 || joinMeeting.status === 201);

  const note = await apiCall('PUT', `/workspaces/${workspaceId}/meetings/${meetingId}/notes`, {
    token: friend.token,
    workspaceId,
    body: { content: 'Catatan live: beta dimulai' },
  });
  check('live note tersimpan', note.status === 200 || note.status === 201);

  const end = await apiCall('POST', `/workspaces/${workspaceId}/meetings/${meetingId}/end`, {
    token: tester.token,
    workspaceId,
  });
  check('meeting diakhiri', end.status === 200 || end.status === 201);

  console.log('\n=== 7. PROJECT + TASK KANBAN (skenario §5.7) ===');
  const project = await apiCall('POST', `/workspaces/${workspaceId}/projects`, {
    token: tester.token,
    workspaceId,
    body: { name: 'Beta Trial', priority: 'HIGH' },
  });
  check('project dibuat', project.status === 201);
  const projectId = project.data.id;

  const task = await apiCall('POST', `/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
    token: tester.token,
    workspaceId,
    body: { title: 'Coba geser kartu', assigneeId: friend.userId },
  });
  check('task dibuat + di-assign ke anggota', task.status === 201 && task.data.assigneeId === friend.userId);

  const move = await apiCall('PATCH', `/workspaces/${workspaceId}/projects/${projectId}/tasks/${task.data.id}`, {
    token: friend.token,
    workspaceId,
    body: { status: 'IN_PROGRESS' },
  });
  check('geser status kartu → IN_PROGRESS', move.status === 200 && move.data.status === 'IN_PROGRESS');

  console.log('\n=== 8. KALENDER + EVENT BERULANG (skenario §5.8 — fitur baru) ===');
  const dayMs = 86_400_000;
  const baseMs = unique; // epoch ms — hindari aritmetika Date + number.
  const iso = (t) => new Date(t).toISOString();
  const event = await apiCall('POST', `/workspaces/${workspaceId}/calendar/events`, {
    token: tester.token,
    workspaceId,
    body: {
      title: 'Demo mingguan beta',
      startAt: iso(baseMs),
      endAt: iso(baseMs + 3600_000),
      recurrence: 'WEEKLY',
      recurrenceUntil: iso(baseMs + 21 * dayMs),
    },
  });
  check('event berulang WEEKLY dibuat', event.status === 201, JSON.stringify(event.data));

  const cal = await apiCall(
    'GET',
    `/workspaces/${workspaceId}/calendar?from=${iso(baseMs)}&to=${iso(baseMs + 7 * dayMs)}`,
    { token: friend.token, workspaceId },
  );
  // Shape calendar: { items: [...] } — kind 'event' untuk manual event.
  const recurrences = (cal.data?.items ?? []).filter((e) => e.title === 'Demo mingguan beta');
  check('agenda 7 hari memuat occurence berulang (≥2)', recurrences.length >= 2, JSON.stringify(cal.data));

  const reminders = await apiCall(
    'GET',
    `/workspaces/${workspaceId}/calendar/reminders?horizonDays=7`,
    { token: tester.token, workspaceId },
  );
  check('pengingat 7 hari hidup', reminders.status === 200);

  console.log('\n=== 9. PRESENSI + REQUEST & APPROVAL (skenario §5.9 Enterprise) ===');
  const clockIn = await apiCall('POST', `/workspaces/${workspaceId}/attendance/clock-in`, {
    token: colleague.token,
    workspaceId,
    body: { note: 'Masuk beta' },
  });
  check('clock in 201 (ON_TIME/LATE)', clockIn.status === 201 && ['ON_TIME', 'LATE'].includes(clockIn.data.status));

  const request = await apiCall('POST', `/workspaces/${workspaceId}/requests`, {
    token: colleague.token,
    workspaceId,
    body: { type: 'LEAVE', title: 'Cuti beta 1 hari', payload: { days: 1 } },
  });
  check('request cuti dibuat oleh MEMBER', request.status === 201, JSON.stringify(request.data));

  const approve = await apiCall('POST', `/workspaces/${workspaceId}/requests/${request.data.id}/approve`, {
    token: tester.token,
    workspaceId,
    body: {},
  });
  check('owner approve request', approve.status === 200 || approve.status === 201);

  const selfApprove = await apiCall('POST', `/workspaces/${workspaceId}/requests`, {
    token: tester.token,
    workspaceId,
    body: { type: 'LEAVE', title: 'Self approval check' },
  });
  const banned = await apiCall('POST', `/workspaces/${workspaceId}/requests/${selfApprove.data.id}/approve`, {
    token: tester.token,
    workspaceId,
    body: {},
  });
  check('self-approval ditolak 403', selfApprove.status === 201 && banned.status === 403);

  console.log('\n=== 10. MODERASI COMMUNITY (skenario §5.10) ===');
  const comChannel = await apiCall('POST', `/workspaces/${comWs.data.id}/channels`, {
    token: tester.token,
    workspaceId: comWs.data.id,
    body: { name: 'pengumuman', type: 'TEXT', visibility: 'PUBLIC' },
  });
  const comMsg = await apiCall('POST', `/workspaces/${comWs.data.id}/channels/${comChannel.data.id}/messages`, {
    token: tester.token,
    workspaceId: comWs.data.id,
    body: { content: 'Pesan owner — langsung VISIBLE' },
  });
  check('pesan owner langsung VISIBLE', comMsg.status === 201 && comMsg.data.status === 'VISIBLE');

  const friendInCom = await apiCall('POST', `/workspaces/${comWs.data.id}/members`, {
    token: tester.token,
    workspaceId: comWs.data.id,
    body: { userId: friend.userId, roleName: 'MEMBER' },
  });
  const memberMsg = await apiCall('POST', `/workspaces/${comWs.data.id}/channels/${comChannel.data.id}/messages`, {
    token: friend.token,
    workspaceId: comWs.data.id,
    body: { content: 'Pesan member — masuk moderasi' },
  });
  check(
    'pesan member COMMUNITY → PENDING_REVIEW',
    memberMsg.status === 201 && memberMsg.data.status === 'PENDING_REVIEW',
    JSON.stringify(memberMsg.data),
  );

  const approveMsg = await apiCall('POST', `/workspaces/${comWs.data.id}/messages/${memberMsg.data.id}/approve`, {
    token: tester.token,
    workspaceId: comWs.data.id,
  });
  check('moderator approve pesan member', approveMsg.status === 200 || approveMsg.status === 201);
  check('anggota kedua benar-benar ditambahkan (pra-cek)', friendInCom.status === 201);

  console.log('\n=== 11. FEEDBACK DI APP (skenario §5.11 — dogfooding) ===');
  const feedback = await apiCall('POST', `/workspaces/${workspaceId}/feedback`, {
    token: friend.token,
    workspaceId,
    body: { type: 'BUG', message: 'Notifikasi kadang telat muncul saat layar mati' },
  });
  check('feedback BUG dikirim', feedback.status === 201);

  const vote = await apiCall('POST', `/workspaces/${workspaceId}/feedback/${feedback.data.id}/vote`, {
    token: tester.token,
    workspaceId,
  });
  check('vote feedback', vote.status === 200 || vote.status === 201);

  const decide = await apiCall('POST', `/workspaces/${workspaceId}/feedback/${feedback.data.id}/decision`, {
    token: tester.token,
    workspaceId,
    body: { status: 'ACCEPTED', decisionNote: 'Masuk backlog beta berikutnya' },
  });
  check('owner memutuskan ACCEPTED', decide.status === 200 || decide.status === 201);

  // Notifikasi dibuat oleh listener event async — beri waktu (poll seperti UI).
  let decidedNotif = null;
  for (let attempt = 0; attempt < 6 && !decidedNotif; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const inbox = await apiCall('GET', '/notifications', { token: friend.token });
    decidedNotif = (inbox.data?.items ?? []).find((n) => n.type === 'feedback.decided');
  }
  check('tester menerima notif keputusan (loop tertutup)', Boolean(decidedNotif));

  console.log('\n=== 12. LOGOUT + LOGIN ULANG (skenario §5.12) ===');
  const logout = await apiCall('DELETE', '/auth/session', { token: friend.token });
  check('logout sukses', logout.status === 200 || logout.status === 201);

  const tokenAfterLogout = await apiCall('GET', '/users/me', { token: friend.token });
  check('token setelah logout ditolak 401', tokenAfterLogout.status === 401);

  const relogin = await apiCall('POST', '/auth/login', {
    body: { email: friendEmail, password: PASSWORD },
  });
  check('login ulang sukses (sesi & data kembali)', relogin.status === 200 || relogin.status === 201);

  const meAfter = await apiCall('GET', '/users/me', { token: relogin.data.token });
  check('profil tersedia setelah login ulang', meAfter.status === 200);

  testerSocket.disconnect();
  friendSocket.disconnect();
  process.exit(summary() ? 0 : 1);
}

main().catch((error) => {
  console.error('Beta flow crashed:', error.message);
  process.exit(1);
});
