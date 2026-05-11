'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@probiz.ai');
  const [password, setPassword] = useState('Probiz01');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <div className="grid grid-2" style={{ marginTop: 44 }}>
        <section className="hero">
          <span className="badge ok">FBR-ready workspace</span>
          <h1 style={{ fontSize: 42, margin: '16px 0 8px' }}>Digital Invoicing SaaS</h1>
          <p className="muted" style={{ fontSize: 18, lineHeight: 1.6 }}>
            Create invoices, suggest HS/PCT codes, track mock FBR submissions, manage firm-client workspaces, and keep audit logs.
          </p>
          <p className="muted">Mock FBR mode is enabled by default. Real FBR/integrator credentials must be configured separately.</p>
        </section>

        <form className="card card-pad" onSubmit={login}>
          <h2>Login</h2>
          <label className="label">Email</label>
          <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} />
          <div style={{ height: 14 }} />
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" disabled={loading} style={{ width: '100%', marginTop: 18 }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </main>
  );
}
