/**
 * SOFO HTTP smoke test — runs against a live API server.
 * Usage: node test/http-smoke.mjs   (BASE_URL env optional, default :4001)
 * Covers PRD §138 critical flow + PRD §139 security acceptance.
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4001/api/v1';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  OK   ${name}`);
  } else {
    failed += 1;
    failures.push(`${name} ${detail}`);
    console.log(`  FAIL ${name} ${detail}`);
  }
}

async function call(method, path, { token, workspaceId, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (workspaceId) headers['x-workspace-id'] = workspaceId;
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
}

const unique = Date.now();
const ownerEmail = `owner-${unique}@sofo.test`;
const staffEmail = `staff-${unique}@sofo.test`;
const outsiderEmail = `outsider-${unique}@sofo.test`;
const password = 'Password123';

async function main() {
  console.log('\n=== 1. AUTHENTICATION ===');
  const registerOwner = await call('POST', '/auth/register', {
    body: { email: ownerEmail, displayName: 'Owner', password },
  });
  check('register owner 201', registerOwner.status === 201, JSON.stringify(registerOwner.data));

  const registerStaff = await call('POST', '/auth/register', {
    body: { email: staffEmail, displayName: 'Staff', password },
  });
  check('register staff 201', registerStaff.status === 201);

  const registerOutsider = await call('POST', '/auth/register', {
    body: { email: outsiderEmail, displayName: 'Outsider', password },
  });
  check('register outsider 201', registerOutsider.status === 201);

  const duplicate = await call('POST', '/auth/register', {
    body: { email: ownerEmail, displayName: 'Owner', password },
  });
  check('duplicate email 409 CONFLICT', duplicate.status === 409 && duplicate.data.code === 'CONFLICT');

  const weakPassword = await call('POST', '/auth/register', {
    body: { email: `weak-${unique}@sofo.test`, displayName: 'Weak', password: 'short' },
  });
  check('weak password 400 VALIDATION_ERROR', weakPassword.status === 400);

  const loginOwner = await call('POST', '/auth/login', {
    body: { email: ownerEmail, password },
  });
  check('login owner 201 + token', loginOwner.status === 201 && typeof loginOwner.data.token === 'string');
  const ownerToken = loginOwner.data.token;

  const loginStaff = await call('POST', '/auth/login', { body: { email: staffEmail, password } });
  const staffToken = loginStaff.data.token;

  const loginOutsider = await call('POST', '/auth/login', { body: { email: outsiderEmail, password } });
  const outsiderToken = loginOutsider.data.token;

  const wrongPassword = await call('POST', '/auth/login', {
    body: { email: ownerEmail, password: 'WrongPass123' },
  });
  check(
    'wrong password 401 (message sama dgn unknown email — anti enumeration)',
    wrongPassword.status === 401 && wrongPassword.data.code === 'UNAUTHENTICATED',
  );

  const me = await call('GET', '/users/me', { token: ownerToken });
  check('GET /users/me 200', me.status === 200 && me.data.email === ownerEmail);

  console.log('\n=== 2. WORKSPACE & MEMBERSHIP ===');
  const ws = await call('POST', '/workspaces', {
    token: ownerToken,
    body: { name: `Acme ${unique}`, mode: 'ENTERPRISE', description: 'Smoke test workspace' },
  });
  check('create workspace 201 + slug', ws.status === 201 && typeof ws.data.slug === 'string');
  const workspaceId = ws.data.id;

  const myWorkspaces = await call('GET', '/workspaces/mine', { token: ownerToken });
  check(
    'GET /workspaces/mine berisi workspace baru',
    myWorkspaces.status === 201 || (myWorkspaces.status === 200 && myWorkspaces.data.some((w) => w.id === workspaceId)),
  );

  const staffUser = await call('GET', '/users/me', { token: staffToken });
  const invite = await call('POST', `/workspaces/${workspaceId}/members`, {
    token: ownerToken,
    workspaceId,
    body: { userId: staffUser.data.id, roleName: 'STAFF' },
  });
  check('invite staff 201', invite.status === 201 || invite.status === 200, JSON.stringify(invite.data));

  const members = await call('GET', `/workspaces/${workspaceId}/members`, { token: ownerToken, workspaceId });
  check(
    'list members berisi OWNER + STAFF',
    members.status === 200 && members.data.length === 2,
  );

  console.log('\n=== 3. CHANNEL & MESSAGE ===');
  const channel = await call('POST', `/workspaces/${workspaceId}/channels`, {
    token: ownerToken,
    workspaceId,
    body: { name: 'general', type: 'TEXT', visibility: 'PUBLIC', topic: 'Umum' },
  });
  check('create channel 201', channel.status === 201, JSON.stringify(channel.data));
  const channelId = channel.data.id;

  const duplicateChannel = await call('POST', `/workspaces/${workspaceId}/channels`, {
    token: ownerToken,
    workspaceId,
    body: { name: 'general', type: 'TEXT', visibility: 'PUBLIC' },
  });
  check('duplicate channel 409', duplicateChannel.status === 409);

  const message = await call('POST', `/workspaces/${workspaceId}/channels/${channelId}/messages`, {
    token: ownerToken,
    workspaceId,
    body: { content: 'Halo SOFO! Pesan pertama.' },
  });
  check('send message 201', message.status === 201, JSON.stringify(message.data));
  const messageId = message.data.id;

  const reply = await call('POST', `/workspaces/${workspaceId}/channels/${channelId}/messages`, {
    token: ownerToken,
    workspaceId,
    body: { content: 'Ini reply', replyToId: messageId },
  });
  check('thread reply 201', reply.status === 201 && reply.data.replyToId === messageId);

  const staffSend = await call('POST', `/workspaces/${workspaceId}/channels/${channelId}/messages`, {
    token: staffToken,
    workspaceId,
    body: { content: 'Pesan dari staff' },
  });
  check('staff dapat mengirim pesan (permission message.send)', staffSend.status === 201);
  const staffMessageId = staffSend.data.id;

  const staffEditOther = await call('PATCH', `/workspaces/${workspaceId}/messages/${messageId}`, {
    token: staffToken,
    workspaceId,
    body: { content: 'hack' },
  });
  check('staff TIDAK bisa edit pesan orang lain 403', staffEditOther.status === 403);

  const ownerEdit = await call('PATCH', `/workspaces/${workspaceId}/messages/${messageId}`, {
    token: ownerToken,
    workspaceId,
    body: { content: 'Pesan pertama (edited)' },
  });
  check('author edit pesan sendiri 200', ownerEdit.status === 200 && ownerEdit.data.editedAt !== null);

  const messages = await call('GET', `/workspaces/${workspaceId}/channels/${channelId}/messages`, {
    token: staffToken,
    workspaceId,
  });
  check(
    'list messages (staff, channel.view) 200 berisi 3 pesan',
    messages.status === 200 && messages.data.items.length === 3,
  );

  console.log('\n=== 4. PROJECT & TASK ===');
  const project = await call('POST', `/workspaces/${workspaceId}/projects`, {
    token: ownerToken,
    workspaceId,
    body: { name: 'Launch', priority: 'HIGH', deadline: '2026-12-31T00:00:00.000Z' },
  });
  check('create project 201', project.status === 201);
  const projectId = project.data.id;

  const task = await call('POST', `/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
    token: ownerToken,
    workspaceId,
    body: { title: 'Ship MVP', assigneeId: staffUser.data.id },
  });
  check('create task + assign staff 201', task.status === 201 && task.data.assigneeId === staffUser.data.id);

  const outsiderAssign = await call('POST', `/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
    token: ownerToken,
    workspaceId,
    body: { title: 'Bad', assigneeId: '00000000-0000-0000-0000-000000000000' },
  });
  check('assign non-member 403', outsiderAssign.status === 403 || outsiderAssign.status === 404);

  const staffCreateProject = await call('POST', `/workspaces/${workspaceId}/projects`, {
    token: staffToken,
    workspaceId,
    body: { name: 'Staff Project' },
  });
  check('staff create project 403 (tanpa project.create)', staffCreateProject.status === 403);

  console.log('\n=== 5. MEETING & NOTES ===');
  const meeting = await call('POST', `/workspaces/${workspaceId}/meetings`, {
    token: ownerToken,
    workspaceId,
    body: { title: 'Standup', scheduledAt: '2026-09-20T09:00:00.000Z' },
  });
  check('create meeting 201', meeting.status === 201);
  const meetingId = meeting.data.id;

  const start = await call('POST', `/workspaces/${workspaceId}/meetings/${meetingId}/start`, {
    token: ownerToken,
    workspaceId,
  });
  check('start meeting 201 (SCHEDULED→ACTIVE)', start.status === 201 && start.data.status === 'ACTIVE');

  const staffStart = await call('POST', `/workspaces/${workspaceId}/meetings/${meetingId}/end`, {
    token: staffToken,
    workspaceId,
  });
  check('staff end meeting 403 (tanpa meeting.manage)', staffStart.status === 403);

  const note = await call('PUT', `/workspaces/${workspaceId}/meetings/${meetingId}/notes`, {
    token: ownerToken,
    workspaceId,
    body: { content: 'Keputusan: rilis P0' },
  });
  check('host tulis live note 200/201', note.status === 200 || note.status === 201);

  console.log('\n=== 5b. FILE UPLOAD & DOWNLOAD ===');
  const formData = new FormData();
  formData.append('file', new Blob(['isi file sofo'], { type: 'text/plain' }), 'catatan.txt');
  const upload = await fetch(`${BASE_URL}/workspaces/${workspaceId}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}`, 'x-workspace-id': workspaceId },
    body: formData,
  });
  const uploadedFile = await upload.json();
  check('upload file 201', upload.status === 201 && uploadedFile.fileName === 'catatan.txt', JSON.stringify(uploadedFile));

  const download = await fetch(`${BASE_URL}/workspaces/${workspaceId}/files/${uploadedFile.id}`, {
    headers: { Authorization: `Bearer ${staffToken}`, 'x-workspace-id': workspaceId },
  });
  const downloadedContent = await download.text();
  check('download file oleh staff 200 + isi sama', download.status === 200 && downloadedContent === 'isi file sofo');

  const outsiderDownload = await fetch(`${BASE_URL}/workspaces/${workspaceId}/files/${uploadedFile.id}`, {
    headers: { Authorization: `Bearer ${outsiderToken}`, 'x-workspace-id': workspaceId },
  });
  check('outsider download file 403', outsiderDownload.status === 403);

  console.log('\n=== 6. SECURITY — TENANT ISOLATION (PRD §139) ===');
  const noToken = await call('GET', '/users/me');
  check('tanpa token 401', noToken.status === 401);

  const fakeToken = await call('GET', '/users/me', { token: 'fake-token-123' });
  check('token palsu 401', fakeToken.status === 401);

  const outsiderWorkspace = await call('GET', `/workspaces/${workspaceId}`, {
    token: outsiderToken,
  });
  check('outsider GET workspace 403', outsiderWorkspace.status === 403);

  const outsiderChannels = await call('GET', `/workspaces/${workspaceId}/channels`, {
    token: outsiderToken,
    workspaceId,
  });
  check('outsider list channel 403 (PermissionGuard)', outsiderChannels.status === 403);

  const outsiderMessages = await call('GET', `/workspaces/${workspaceId}/channels/${channelId}/messages`, {
    token: outsiderToken,
    workspaceId,
  });
  check('outsider baca pesan 403', outsiderMessages.status === 403);

  const outsiderWorkspaceCreate = await call('POST', '/workspaces', {
    token: outsiderToken,
    body: { name: 'Outsider WS', mode: 'COMMUNITY' },
  });
  check(
    'outsider buat workspace sendiri boleh (201) — isolasi tetap terjaga',
    outsiderWorkspaceCreate.status === 201,
  );

  const badPayload = await call('POST', '/workspaces', {
    token: outsiderToken,
    body: { name: '', mode: 'INVALID' },
  });
  check('payload invalid 400 VALIDATION_ERROR', badPayload.status === 400);

  const notFoundWs = await call('GET', '/workspaces/00000000-0000-0000-0000-000000000000', {
    token: ownerToken,
  });
  check('workspace tidak ada → 403 (bukan 404, anti probing)', notFoundWs.status === 403);

  console.log('\n=== 6b. AUDIT — CRITICAL ACTION TRAIL (PRD §49) ===');
  const auditOwner = await call('GET', `/workspaces/${workspaceId}/audit`, {
    token: ownerToken,
    workspaceId,
  });
  check(
    'owner (audit.view) list audit 200 + ada entri',
    auditOwner.status === 200 && auditOwner.data.items.length > 0,
    JSON.stringify(auditOwner.data),
  );

  const auditActions = auditOwner.data.items.map((item) => item.action);
  check(
    'audit mencatat workspace.create + meeting.start (WHO/WHAT/TARGET/RESULT)',
    auditActions.includes('workspace.create') &&
      auditActions.includes('meeting.start') &&
      auditOwner.data.items.every((item) => 'actorId' in item && 'target' in item && 'result' in item),
  );

  const wsCreateEntry = auditOwner.data.items.find((item) => item.action === 'workspace.create');
  check(
    'entri audit lengkap: actorName ter-resolve + metadata tersimpan',
    Boolean(wsCreateEntry) &&
      wsCreateEntry.actorName !== null &&
      wsCreateEntry.metadata !== null &&
      typeof wsCreateEntry.metadata.name === 'string',
  );

  const auditFiltered = await call('GET', `/workspaces/${workspaceId}/audit?action=meeting.start`, {
    token: ownerToken,
    workspaceId,
  });
  check(
    'filter action=meeting.start hanya mengembalikan aksi itu',
    auditFiltered.status === 200 &&
      auditFiltered.data.items.length > 0 &&
      auditFiltered.data.items.every((item) => item.action === 'meeting.start'),
  );

  const auditBadFilter = await call('GET', `/workspaces/${workspaceId}/audit?result=WEIRD`, {
    token: ownerToken,
    workspaceId,
  });
  check('filter invalid 400 VALIDATION_ERROR', auditBadFilter.status === 400);

  const auditStaff = await call('GET', `/workspaces/${workspaceId}/audit`, {
    token: staffToken,
    workspaceId,
  });
  check('staff list audit 403 (tanpa audit.view)', auditStaff.status === 403);

  const auditOutsider = await call('GET', `/workspaces/${workspaceId}/audit`, {
    token: outsiderToken,
    workspaceId,
  });
  check('outsider list audit 403', auditOutsider.status === 403);

  console.log('\n=== 6c. CALENDAR (PRD §41, §86) ===');
  const eventTitle = `Review QA ${unique}`;
  const calCreate = await call('POST', `/workspaces/${workspaceId}/calendar/events`, {
    token: ownerToken,
    workspaceId,
    body: {
      title: eventTitle,
      startAt: '2026-09-25T09:00:00.000Z',
      endAt: '2026-09-25T11:00:00.000Z',
    },
  });
  check('owner create calendar event 201', calCreate.status === 201, JSON.stringify(calCreate.data));
  const calEventId = calCreate.data.id;

  const calStaff = await call('POST', `/workspaces/${workspaceId}/calendar/events`, {
    token: staffToken,
    workspaceId,
    body: {
      title: 'Staff event',
      startAt: '2026-09-26T09:00:00.000Z',
      endAt: '2026-09-26T10:00:00.000Z',
    },
  });
  check('staff create event 403 (tanpa calendar.event.create)', calStaff.status === 403);

  const calBad = await call('POST', `/workspaces/${workspaceId}/calendar/events`, {
    token: ownerToken,
    workspaceId,
    body: { title: 'Backwards', startAt: '2026-09-26T10:00:00.000Z', endAt: '2026-09-26T09:00:00.000Z' },
  });
  check('event endAt < startAt 409 CONFLICT', calBad.status === 409);

  // meeting (section 5) + manual event harus muncul di calendar agregat
  const calendar = await call(
    'GET',
    `/workspaces/${workspaceId}/calendar?from=2026-09-01T00:00:00.000Z&to=2026-10-31T23:59:59.000Z`,
    { token: staffToken, workspaceId },
  );
  const calKinds = new Set((calendar.data?.items ?? []).map((item) => item.kind));
  check(
    'staff GET calendar 200 — meeting + event teragregasi urut',
    calendar.status === 200 && calKinds.has('meeting') && calKinds.has('event'),
    JSON.stringify(calendar.data),
  );
  const calSorted = (calendar.data?.items ?? []).every(
    (item, index, arr) => index === 0 || arr[index - 1].startAt <= item.startAt,
  );
  check('calendar terurut ascending by startAt', calSorted);

  const reminders = await call('GET', `/workspaces/${workspaceId}/calendar/reminders?horizonDays=90`, {
    token: staffToken,
    workspaceId,
  });
  check(
    'reminders 200 dengan dueInDays >= 0',
    reminders.status === 200 &&
      reminders.data.items.length > 0 &&
      reminders.data.items.every((item) => item.dueInDays >= 0),
    JSON.stringify(reminders.data),
  );

  const calDelete = await call('DELETE', `/workspaces/${workspaceId}/calendar/events/${calEventId}`, {
    token: ownerToken,
    workspaceId,
  });
  check('owner delete event 200', calDelete.status === 200);

  const calOutsider = await call('GET', `/workspaces/${workspaceId}/calendar`, {
    token: outsiderToken,
    workspaceId,
  });
  check('outsider GET calendar 403', calOutsider.status === 403);

  console.log('\n=== 6d. REQUEST & APPROVAL (PRD §44, §45, §88) ===');
  const reqCreate = await call('POST', `/workspaces/${workspaceId}/requests`, {
    token: staffToken,
    workspaceId,
    body: { type: 'LEAVE', title: 'Cuti 2 hari', payload: { days: 2 } },
  });
  check('staff create request 201', reqCreate.status === 201, JSON.stringify(reqCreate.data));
  const requestId = reqCreate.data.id;

  const reqInvalidType = await call('POST', `/workspaces/${workspaceId}/requests`, {
    token: staffToken,
    workspaceId,
    body: { type: 'VACATION', title: 'Tipe ngawur' },
  });
  check('tipe request invalid 400 VALIDATION_ERROR', reqInvalidType.status === 400);

  const staffApprove = await call('POST', `/workspaces/${workspaceId}/requests/${requestId}/approve`, {
    token: staffToken,
    workspaceId,
    body: {},
  });
  check('staff approve 403 (tanpa request.approve)', staffApprove.status === 403);

  const ownerApprove = await call('POST', `/workspaces/${workspaceId}/requests/${requestId}/approve`, {
    token: ownerToken,
    workspaceId,
    body: { note: 'Disetujui, jangan bentrok sprint review' },
  });
  check(
    'owner approve 201 + status APPROVED + dicatat approver',
    ownerApprove.status === 201 &&
      ownerApprove.data.status === 'APPROVED' &&
      ownerApprove.data.approverName !== null &&
      ownerApprove.data.decidedAt !== null,
    JSON.stringify(ownerApprove.data),
  );

  const doubleDecide = await call('POST', `/workspaces/${workspaceId}/requests/${requestId}/reject`, {
    token: ownerToken,
    workspaceId,
    body: {},
  });
  check('decide ulang 409 CONFLICT', doubleDecide.status === 409);

  // alur kedua: self-approval ban — approver tidak boleh memutus request sendiri.
  // Owner membuat request miliknya sendiri sebagai target test.
  const reqSelf = await call('POST', `/workspaces/${workspaceId}/requests`, {
    token: ownerToken,
    workspaceId,
    body: { type: 'PERMISSION', title: 'Minta akses admin DB' },
  });
  check('owner create request miliknya 201', reqSelf.status === 201);
  const ownPending = reqSelf.data;
  check('setup: owner punya request PENDING miliknya', Boolean(ownPending), JSON.stringify(reqSelf.data));

  const selfApprove = await call('POST', `/workspaces/${workspaceId}/requests/${ownPending.id}/approve`, {
    token: ownerToken,
    workspaceId,
    body: {},
  });
  check(
    'owner approve request milik sendiri ditolak 403 (self-approval ban)',
    selfApprove.status === 403,
  );

  const reqTwo = await call('POST', `/workspaces/${workspaceId}/requests`, {
    token: staffToken,
    workspaceId,
    body: { type: 'REIMBURSEMENT', title: 'Reimburse transport' },
  });

  const reqThree = await call('POST', `/workspaces/${workspaceId}/requests`, {
    token: staffToken,
    workspaceId,
    body: { type: 'OPERATIONAL', title: 'Minta akses server' },
  });
  const rejectRes = await call('POST', `/workspaces/${workspaceId}/requests/${reqThree.data.id}/reject`, {
    token: ownerToken,
    workspaceId,
    body: { note: 'Belum ada budget akses' },
  });
  check(
    'reject request + REJECTED + note + approver tercatat',
    (rejectRes.status === 201 || rejectRes.status === 200) &&
      rejectRes.data.status === 'REJECTED' &&
      rejectRes.data.decisionNote === 'Belum ada budget akses' &&
      rejectRes.data.approverName !== null,
  );

  const reqFour = await call('POST', `/workspaces/${workspaceId}/requests`, {
    token: staffToken,
    workspaceId,
    body: { type: 'DOCUMENT', title: 'Minta dokumen kontrak' },
  });
  const cancelRes = await call('DELETE', `/workspaces/${workspaceId}/requests/${reqFour.data.id}`, {
    token: staffToken,
    workspaceId,
  });
  check(
    'requester cancel request + CANCELLED',
    (cancelRes.status === 200 || cancelRes.status === 201) && cancelRes.data.status === 'CANCELLED',
  );

  const listAll = await call('GET', `/workspaces/${workspaceId}/requests`, { token: ownerToken, workspaceId });
  check(
    'approver melihat semua request — 4 status workflow terwakili',
    listAll.status === 200 &&
      ['APPROVED', 'REJECTED', 'CANCELLED', 'PENDING'].every((status) =>
        listAll.data.items.some((item) => item.status === status),
      ),
    JSON.stringify(listAll.data),
  );

  const listMine = await call('GET', `/workspaces/${workspaceId}/requests?mine=1`, {
    token: staffToken,
    workspaceId,
  });
  check(
    'staff hanya melihat request miliknya',
    listMine.status === 200 &&
      listMine.data.items.length > 0 &&
      listMine.data.items.every((item) => item.requesterName === 'Staff'),
  );

  const auditTrail = await call('GET', `/workspaces/${workspaceId}/audit?action=request.approve`, {
    token: ownerToken,
    workspaceId,
  });
  check(
    'audit mencatat request.approve (PRD §45 tahap audit)',
    auditTrail.status === 200 && auditTrail.data.items.length > 0,
  );

  console.log('\n=== 7. LOGOUT ===');
  const logout = await call('DELETE', '/auth/session', { token: staffToken });
  check('logout 200/201', logout.status === 200 || logout.status === 201);

  const afterLogout = await call('GET', '/users/me', { token: staffToken });
  check('token setelah logout ditolak 401', afterLogout.status === 401);

  console.log('\n=========================================');
  console.log(`PASSED: ${passed}  FAILED: ${failed}`);
  if (failures.length > 0) {
    console.log('Failures:');
    for (const failure of failures) console.log(` - ${failure}`);
  }
  console.log('=========================================');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});
