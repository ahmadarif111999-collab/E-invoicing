'use client';

import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';

type HsCodeResult = {
  id: string;
  code: string;
  displayCode: string;
  chapter?: string | null;
  description: string;
  customsDuty?: string | null;
  sourcePage?: number | null;
};

const examples = ['cotton fabric', 'mobile phone', 'rice', 'machinery parts', 'software service'];

export default function HsCodesPage() {
  const [q, setQ] = useState('cotton fabric');
  const [results, setResults] = useState<HsCodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function search(event?: React.FormEvent, overrideQuery?: string) {
    event?.preventDefault();

    const query = (overrideQuery || q).trim();

    if (!query) {
      setResults([]);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/hs-codes/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search HS/PCT codes');
      }

      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search HS/PCT codes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    search(undefined, 'cotton fabric');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseExample(example: string) {
    setQ(example);
    search(undefined, example);
  }

  return (
    <>
      <AppNav />

      <main className="container">
        <section className="dashboard-hero">
          <div>
            <span className="eyebrow">HS/PCT intelligence</span>
            <h1>Search Pakistan HS/PCT codes</h1>
            <p>
              Quickly search imported tariff rows and use them as suggestions while preparing
              invoices. Final classification, tax treatment, sale type, and exemptions should still
              be reviewed by a tax professional.
            </p>

            <form className="hero-actions" onSubmit={search}>
              <input
                className="input"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search product, service, or PCT code"
                style={{ minWidth: 320, flex: 1 }}
              />
              <button className="btn" type="submit" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>

          <div className="workspace-card">
            <div className="workspace-topline">Lookup mode</div>
            <h2>Suggestion only</h2>
            <p>
              The CD% value is customs duty reference data. It should not be auto-treated as sales
              tax or final invoice tax rate.
            </p>
            <span className="mode-pill">Manual review required</span>
          </div>
        </section>

        {error ? (
          <div className="alert danger">
            <strong>Search failed.</strong>
            <span>{error}</span>
          </div>
        ) : null}

        <section className="grid grid-3">
          <div className="card card-pad">
            <span className="eyebrow">Quick examples</span>
            <h2>Try a common search</h2>
            <p>Use these demo searches to check that HS/PCT data is available in Neon.</p>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {examples.map((example) => (
                <button
                  key={example}
                  className="btn ghost small"
                  type="button"
                  onClick={() => chooseExample(example)}
                  style={{ justifyContent: 'flex-start', textTransform: 'capitalize' }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="card card-pad span-2">
            <div className="section-head">
              <div>
                <span className="eyebrow">Search results</span>
                <h2>
                  {loading
                    ? 'Searching...'
                    : `${results.length.toLocaleString('en-PK')} matching rows`}
                </h2>
              </div>
              <span className="badge warn">Review before use</span>
            </div>

            {loading ? (
              <div className="loading-panel">
                <div>
                  <div className="loader" />
                  <p>Searching HS/PCT code database...</p>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <h3>No HS/PCT rows found</h3>
                <p>
                  Try a broader product description, a shorter keyword, or a numeric PCT code
                  without punctuation.
                </p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>PCT code</th>
                      <th>Description</th>
                      <th>CD%</th>
                      <th>Source page</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.displayCode}</strong>
                          {row.chapter ? (
                            <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                              Chapter {row.chapter}
                            </p>
                          ) : null}
                        </td>
                        <td>{row.description}</td>
                        <td>
                          <span className="badge neutral">{row.customsDuty || '-'}</span>
                        </td>
                        <td>{row.sourcePage || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="note-panel">
          <strong>Important:</strong>
          <span>
            HS/PCT suggestions must not automatically decide sales tax, UOM, SRO schedule,
            exemption treatment, or FBR scenario mapping. Keep these fields configurable and
            reviewed.
          </span>
        </section>
      </main>
    </>
  );
}
