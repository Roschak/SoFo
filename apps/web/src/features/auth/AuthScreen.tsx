import { useState, type FormEvent } from 'react';
import { ApiRequestError } from '../../lib/api';
import { useAuth } from '../../state/AuthContext';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import {
  DEFAULT_SERVER_URL,
  isNativePlatform,
  loadServerUrl,
  probeServer,
  resetServerUrl,
  saveServerUrl,
} from '../../lib/server-config';
import './AuthScreen.css';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Phase 26 beta: native testers point the app at the owner's LAN server.
  const native = isNativePlatform();
  const [serverUrl, setServerUrl] = useState(() => loadServerUrl());
  const [serverBusy, setServerBusy] = useState(false);
  const [serverFeedback, setServerFeedback] = useState<string | null>(null);

  async function handleSaveServer(event: FormEvent) {
    event.preventDefault();
    const saved = saveServerUrl(serverUrl);
    if (saved === null) {
      setServerFeedback('URL tidak valid — pakai format http://IP:PORT');
      return;
    }
    setServerUrl(saved);
    setServerBusy(true);
    setServerFeedback('Menguji koneksi…');
    const latency = await probeServer(saved);
    setServerBusy(false);
    if (latency === null) {
      setServerFeedback('Server tidak terjangkau — cek alamat, server hidup, & WiFi');
      navigator.vibrate?.(120);
    } else {
      setServerFeedback(`Terhubung (${latency} ms)`);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, displayName, password);
      }
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : 'Tidak dapat terhubung ke server',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <section className="auth__card">
        <div className="auth__brand">
          <span className="auth__logo">SOFO</span>
          <p className="auth__tagline">Your All-in-One Digital Office</p>
        </div>

        <h1 className="auth__title">
          {mode === 'login' ? 'Masuk ke workspace kamu' : 'Buat akun baru'}
        </h1>

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="kamu@perusahaan.id"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {mode === 'register' ? (
            <Field
              label="Nama tampilan"
              autoComplete="name"
              placeholder="Nama kamu"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              minLength={1}
              maxLength={100}
            />
          ) : null}
          <Field
            label="Password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder={mode === 'register' ? 'Minimal 8 karakter, huruf + angka' : 'Password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />

          {error ? (
            <p className="auth__error" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" loading={busy} disabled={!email || !password}>
            {mode === 'login' ? 'Masuk' : 'Daftar'}
          </Button>
        </form>

        {native ? (
          <form className="auth__server" onSubmit={handleSaveServer}>
            <Field
              label="Server (beta — WiFi sama dengan owner)"
              type="text"
              inputMode="url"
              placeholder={DEFAULT_SERVER_URL}
              value={serverUrl}
              onChange={(event) => setServerUrl(event.target.value)}
              spellCheck={false}
            />
            <div className="auth__server-actions">
              <Button type="submit" variant="ghost" size="sm" loading={serverBusy}>
                Simpan & uji koneksi
              </Button>
              <button
                type="button"
                className="auth__switch-button"
                onClick={() => {
                  resetServerUrl();
                  setServerUrl(DEFAULT_SERVER_URL);
                  setServerFeedback(null);
                }}
              >
                Pakai default
              </button>
            </div>
            {serverFeedback ? (
              <p className="auth__server-feedback" role="status">
                {serverFeedback}
              </p>
            ) : null}
          </form>
        ) : null}

        <p className="auth__switch">
          {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
          <button
            type="button"
            className="auth__switch-button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? 'Daftar sekarang' : 'Masuk'}
          </button>
          {' · '}
          <button
            type="button"
            className="auth__switch-button"
            onClick={() => {
              window.location.hash = '#atas';
              window.location.reload();
            }}
          >
            Kembali ke beranda
          </button>
        </p>
      </section>
    </main>
  );
}
