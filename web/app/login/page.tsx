'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOk('');

    const supabase = getSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  async function onResetPassword() {
    if (!email) {
      setError('Ingresá tu email para recuperar contraseña.');
      return;
    }

    setSendingReset(true);
    setError('');
    setOk('');

    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (resetError) {
      setError(resetError.message);
      setSendingReset(false);
      return;
    }

    setOk('Te enviamos un email para restablecer la contraseña.');
    setSendingReset(false);
  }

  return (
    <main className="container" style={{ maxWidth: 460, paddingTop: 70 }}>
      <section className="card">
        <div className="brand-wrap">
          <img className="brand-logo" src="/par-logo.jpg" alt="PAR - Partido Arraigo y Renovación" />
        </div>
        <h1>Agenda Reuniones Vecinos</h1>
        <p className="small">Acceso privado para equipo interno</p>
        <form className="grid" onSubmit={onSubmit}>
          <div className="row">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="row">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error ? <p className="error">{error}</p> : null}
          {ok ? <p className="success">{ok}</p> : null}
          <button type="submit" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
          <button className="link-button" type="button" onClick={onResetPassword} disabled={sendingReset}>
            {sendingReset ? 'Enviando recuperación...' : 'Recuperar contraseña'}
          </button>
        </form>
      </section>
    </main>
  );
}
