/**
 * Shared helpers for SOFO smoke tests (no duplication between suites).
 */

export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4001/api/v1';
export const PASSWORD = 'Password123';

export function createChecker() {
  let passed = 0;
  let failed = 0;
  const failures = [];

  return {
    check(name, condition, detail = '') {
      if (condition) {
        passed += 1;
        console.log(`  OK   ${name}`);
      } else {
        failed += 1;
        failures.push(`${name} ${detail}`);
        console.log(`  FAIL ${name} ${detail}`);
      }
    },
    summary() {
      console.log('\n=========================================');
      console.log(`PASSED: ${passed}  FAILED: ${failed}`);
      if (failures.length > 0) {
        console.log('Failures:');
        for (const failure of failures) console.log(` - ${failure}`);
      }
      console.log('=========================================');
      return failed === 0;
    },
  };
}

export async function apiCall(method, path, { token, workspaceId, body } = {}) {
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

/** Registers a user and returns { userId, token }. */
export async function registerAndLogin(email) {
  await apiCall('POST', '/auth/register', {
    body: { email, displayName: email.split('@')[0], password: PASSWORD },
  });
  const login = await apiCall('POST', '/auth/login', {
    body: { email, password: PASSWORD },
  });
  const me = await apiCall('GET', '/users/me', { token: login.data.token });
  return { userId: me.data.id, token: login.data.token };
}
