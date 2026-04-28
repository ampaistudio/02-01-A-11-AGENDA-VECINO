'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setOk('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setOk('Contraseña actualizada. Ya podés ingresar.');
    setLoading(false);
    setTimeout(() => {
      router.push('/login');
      router.refresh();
    }, 1200);
  }

  return (
    <main className="container" style={{ maxWidth: 460, paddingTop: 70 }}>
      <section className="card">
        <div className="brand-wrap">
          <img className="brand-logo" src="/par-logo.jpg" alt="PAR" />
        </div>
        <h1>Restablecer contraseña</h1>
        <p className="small">Definí una nueva contraseña para continuar.</p>
        <form className="grid" onSubmit={onSubmit}>
          <div className="row">
            <label>Nueva contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="row">
            <label>Confirmar contraseña</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          {error ? <p className="error">{error}</p> : null}
          {ok ? <p className="success">{ok}</p> : null}
          <button type="submit" disabled={loading}>
            {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </section>
    </main>
  );
}
