'use client';

import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';

type DashboardData = {
  user: { name: string; email: string };
  businesses: { id: string; name: string }[];
  invoiceCount: number;
  acceptedCount: number;
  rejectedCount: number;
  auditCount: number;
  recentInvoices: any[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dashboard')
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Failed to load dashboard');
        setData(body);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="container">
      <div className="between">
        <div>
          <span className="badge">Secure workspace</span>
          <h1>Dashboard</h1>
          <p className="muted">Firm-controlled digital invoicing workspace for Pakistani businesses.</p>
        </div>
        <button className="btn secondary" onClick={() => fetch('/api/auth/logout', { method: 'POST' }).then(() => location.href = '/login')}>Logout</button>
      </div>
      <AppNav />

      {error ? <p className="error">{error}</p> : null}
      {!data ? <p className="muted">Loading...</p> : (
        <>
          <div className="grid grid-3">
            <div className="kpi"><h3>{data.invoiceCount}</h3><p>Total invoices</p></div>
            <div className="kpi"><h3>{data.acceptedCount}</h3><p>Mock accepted</p></div>
            <div className="kpi"><h3>{data.rejectedCount}</h3><p>Mock rejected</p></div>
          </div>

          <section className="card card-pad" style={{ marginTop: 20 }}>
            <div className="between">
              <h2>Recent invoices</h2>
              <a className="btn" href="/invoices/new">Create invoice</a>
            </div>
            <table>
              <thead><tr><th>Invoice</th><th>Business</th><th>Buyer</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>
                {data.recentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><a href={`/invoices/${invoice.id}`}>{invoice.invoiceNumber}</a></td>
                    <td>{invoice.business.name}</td>
                    <td>{invoice.buyerName}</td>
                    <td><span className="badge">{invoice.status}</span></td>
                    <td>{Number(invoice.grandTotal).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}
