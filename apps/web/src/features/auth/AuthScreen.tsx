import { useState, type FormEvent } from 'react';
import { ApiRequestError } from '../../lib/api';
import { useAuth } from '../../state/AuthContext';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
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
        </p>
      </section>
    </main>
  );
}
