'use client';

import { useState } from 'react';
import { AppNav } from '@/components/AppNav';

export default function HsCodesPage() {
  const [q, setQ] = useState('cotton fabric');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(event?: React.FormEvent) {
    event?.preventDefault();
    setLoading(true);
    const response = await fetch(`/api/hs-codes/search?q=${encodeURIComponent(q)}`);
    const data = await response.json();
    setResults(data.results || []);
    setLoading(false);
  }

  return (
    <main className="container">
      <h1>HS/PCT code lookup</h1>
      <p className="muted">Search imported Pakistan Customs Tariff rows. These are suggestions only and must be reviewed by a tax/customs expert.</p>
      <AppNav />
      <form className="card card-pad row" onSubmit={search}>
        <input className="input" style={{ flex: 1 }} value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search product, service, or code" />
        <button className="btn">{loading ? 'Searching...' : 'Search'}</button>
      </form>
      <section className="card card-pad" style={{ marginTop: 18 }}>
        <table>
          <thead><tr><th>PCT Code</th><th>Description</th><th>CD%</th><th>Source page</th></tr></thead>
          <tbody>
            {results.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.displayCode}</strong></td>
                <td>{row.description}</td>
                <td>{row.customsDuty || '-'}</td>
                <td>{row.sourcePage || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
