'use client';

import { useEffect, useMemo, useState } from 'react';

export type HsCodePickerValue = {
  id: string;
  code: string;
  displayCode: string;
  chapter?: string | null;
  description: string;
  customsDuty?: string | null;
  sourcePage?: number | null;
};

type HsCodeSearchResponse = {
  results: HsCodePickerValue[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

type HsCodePickerProps = {
  label?: string;
  helper?: string;
  value?: HsCodePickerValue | null;
  initialQuery?: string;
  onSelect: (value: HsCodePickerValue | null) => void;
};

const PAGE_SIZE = 25;

const quickSearches = ['cotton', 'rice', 'mobile', 'machinery', 'software', 'textile'];

function compactNumber(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString('en-PK');
}

export function HsCodePicker({
  label = 'HS/PCT code',
  helper = 'Search by PCT code, display code, chapter, or product description.',
  value,
  initialQuery = '',
  onSelect
}: HsCodePickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [chapter, setChapter] = useState('');
  const [results, setResults] = useState<HsCodePickerValue[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedText = useMemo(() => {
    if (!value) return 'No HS/PCT code selected.';
    return `${value.displayCode} - ${value.description}`;
  }, [value]);

  async function search(nextOffset = 0, append = false, overrideQuery?: string, overrideChapter?: string) {
    const finalQuery = overrideQuery ?? query;
    const finalChapter = overrideChapter ?? chapter;

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        q: finalQuery.trim(),
        limit: String(PAGE_SIZE),
        offset: String(nextOffset)
      });

      if (finalChapter.trim()) {
        params.set('chapter', finalChapter.trim());
      }

      const response = await fetch(`/api/hs-codes/search?${params.toString()}`);
      const data = (await response.json()) as HsCodeSearchResponse;

      if (!response.ok) {
        throw new Error((data as any).error || 'Failed to search HS/PCT codes');
      }

      setResults((current) => (append ? [...current, ...(data.results || [])] : data.results || []));
      setTotal(data.total || 0);
      setHasMore(Boolean(data.hasMore));
      setOffset(nextOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search HS/PCT codes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialQuery) {
      search(0, false, initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    search(0, false);
  }

  function chooseQuickSearch(text: string) {
    setQuery(text);
    search(0, false, text);
  }

  function clearFilters() {
    setQuery('');
    setChapter('');
    setResults([]);
    setTotal(0);
    setHasMore(false);
    setOffset(0);
  }

  return (
    <div className="card card-pad" style={{ background: '#f8fafc' }}>
      <div className="section-head compact">
        <div>
          <span className="eyebrow">{label}</span>
          <h2>Manual HS/PCT selector</h2>
          <p style={{ marginBottom: 0 }}>{helper}</p>
        </div>
        <span className="badge warn">Review required</span>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <span className="label">Selected code</span>
        <p style={{ marginBottom: 12 }}>{selectedText}</p>

        {value ? (
          <button className="btn ghost small" type="button" onClick={() => onSelect(null)}>
            Clear selected HS/PCT
          </button>
        ) : null}
      </div>

      <form className="grid grid-3" onSubmit={submit} style={{ marginBottom: 14 }}>
        <label style={{ gridColumn: 'span 2' }}>
          <span className="label">Search code or description</span>
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. 5208, cotton fabric, mobile phone"
          />
        </label>

        <label>
          <span className="label">Chapter</span>
          <input
            className="input"
            value={chapter}
            onChange={(event) => setChapter(event.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder="Optional, e.g. 52"
          />
        </label>

        <div className="row" style={{ gridColumn: '1 / -1' }}>
          <button className="btn secondary" type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search HS/PCT'}
          </button>

          <button className="btn ghost" type="button" onClick={() => search(0, false, '', chapter)}>
            Browse list
          </button>

          <button className="btn ghost" type="button" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </form>

      <div className="row" style={{ marginBottom: 16 }}>
        {quickSearches.map((text) => (
          <button
            key={text}
            className="btn ghost small"
            type="button"
            onClick={() => chooseQuickSearch(text)}
            style={{ textTransform: 'capitalize' }}
          >
            {text}
          </button>
        ))}
      </div>

      {error ? (
        <div className="alert danger">
          <strong>HS/PCT search issue</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <div className="between" style={{ marginBottom: 12 }}>
        <p style={{ marginBottom: 0 }}>
          Showing {compactNumber(results.length)} of {compactNumber(total)} matching rows.
        </p>
        {total > 0 ? <span className="badge info">{compactNumber(total)} total</span> : null}
      </div>

      {results.length === 0 ? (
        <div className="empty-state">
          <h3>No HS/PCT rows loaded</h3>
          <p>
            Search by product name, description, exact PCT code, or click Browse list to inspect the
            seeded HS/PCT data.
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.displayCode}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                      Chapter {row.chapter || row.code.slice(0, 2)}
                    </p>
                  </td>
                  <td>{row.description}</td>
                  <td>
                    <span className="badge neutral">{row.customsDuty || '-'}</span>
                  </td>
                  <td>
                    <button className="btn secondary small" type="button" onClick={() => onSelect(row)}>
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore ? (
        <div style={{ marginTop: 16 }}>
          <button
            className="btn ghost"
            type="button"
            onClick={() => search(offset + PAGE_SIZE, true)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load more HS/PCT rows'}
          </button>
        </div>
      ) : null}

      <section className="note-panel" style={{ marginTop: 16 }}>
        <strong>Important:</strong>
        <span>
          HS/PCT selection is still a review step. CD% is customs duty reference data and must not
          be treated as sales tax automatically.
        </span>
      </section>
    </div>
  );
}
