'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const partnerEmails = [
  'ahmadarif111999@gmail.com',
  'yjavaid01@gmail.com',
  'maysumzaidi2001@gmail.com',
  'asfandsajjid@gmail.com',
  'ali.awan9167@gmail.com'
];

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

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
      <section className="grid grid-2" style={{ alignItems: 'stretch', minHeight: '78vh' }}>
        <div className="hero">
          <span className="eyebrow">Private ProBiz workspace</span>
          <h1>FBR-ready invoicing for the ProBiz team</h1>
          <p>
            Create invoices, review HS/PCT suggestions, manage client businesses, track mock FBR
            submissions, and keep a clean audit trail from one controlled firm workspace.
          </p>

          <div className="grid grid-2" style={{ marginTop: 26 }}>
            <div className="card card-pad">
              <span className="badge ok">5 partner logins</span>
              <h3 style={{ marginTop: 14 }}>Restricted access</h3>
              <p>
                Only approved ProBiz partners should use this beta workspace. Client portal access
                remains disabled until strict role permissions are fully implemented.
              </p>
            </div>

            <div className="card card-pad">
              <span className="badge warn">Mock FBR mode</span>
              <h3 style={{ marginTop: 14 }}>Safe testing</h3>
              <p>
                This app is designed for digital invoicing workflows, but it is not claiming live
                FBR certification or licensed-integrator status.
              </p>
            </div>
          </div>

          <div className="note-panel">
            <strong>Beta note:</strong>
            <span>
              Use dummy client and invoice data only. Real FBR credentials, real submissions, and
              real tax data should wait until the compliance setup is complete.
            </span>
          </div>
        </div>

        <form className="card card-pad" onSubmit={login}>
          <span className="eyebrow">Secure sign in</span>
          <h2>Login to ProBiz E-Invoicing</h2>
          <p>
            Sign in with one of the approved ProBiz partner accounts. The old seed login is no
            longer the recommended account.
          </p>

          <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
            <label>
              <span className="label">Email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="partner@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              <span className="label">Password</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </label>

            {error ? (
              <div className="alert danger">
                <strong>Could not log in</strong>
                <span>{error}</span>
              </div>
            ) : null}

            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>

          <div className="card card-pad" style={{ marginTop: 22, background: '#f8fafc' }}>
            <h3>Approved partner emails</h3>
            <p style={{ marginBottom: 12 }}>
              These are the seeded beta accounts for the ProBiz workspace.
            </p>

            <div style={{ display: 'grid', gap: 8 }}>
              {partnerEmails.map((partnerEmail) => (
                <button
                  key={partnerEmail}
                  className="btn ghost small"
                  type="button"
                  onClick={() => setEmail(partnerEmail)}
                  style={{ justifyContent: 'flex-start' }}
                >
                  {partnerEmail}
                </button>
              ))}
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
