'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppNav } from '@/components/AppNav';

type Business = {
  id: string;
  name: string;
  ntn?: string | null;
  strn?: string | null;
  address?: string | null;
};

type HsSuggestion = {
  id: string;
  code: string;
  displayCode: string;
  description: string;
  confidence?: number;
  customsDuty?: string | null;
};

type Line = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  taxRate: number;
  hsCodeId?: string | null;
  hsLabel?: string;
  suggestions?: HsSuggestion[];
  suggesting?: boolean;
};

const pkrFormatter = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 0
});

function newLine(): Line {
  return {
    description: '',
    quantity: 1,
    unit: 'PCS',
    unitPrice: 0,
    discount: 0,
    taxRate: 18,
    hsCodeId: null,
    hsLabel: '',
    suggestions: [],
    suggesting: false
  };
}

function money(value: number | string | null | undefined) {
  return pkrFormatter.format(Number(value || 0));
}

function calculateLine(line: Line) {
  const base = Number(line.quantity || 0) * Number(line.unitPrice || 0);
  const taxable = Math.max(0, base - Number(line.discount || 0));
  const tax = taxable * (Number(line.taxRate || 0) / 100);
  const total = taxable + tax;

  return {
    base,
    taxable,
    tax,
    total
  };
}

export default function NewInvoicePage() {
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState('');
  const [buyerName, setBuyerName] = useState('Retail House Lahore');
  const [buyerNtn, setBuyerNtn] = useState('7654321-0');
  const [buyerStrn, setBuyerStrn] = useState('3277876543210');
  const [buyerCnic, setBuyerCnic] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('Lahore, Pakistan');
  const [items, setItems] = useState<Line[]>([
    {
      ...newLine(),
      description: 'cotton fabric',
      unit: 'MTR',
      unitPrice: 1000
    }
  ]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/businesses')
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load businesses');
        }

        setBusinesses(data.businesses || []);
        setBusinessId(data.businesses?.[0]?.id || '');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load businesses');
      })
      .finally(() => {
        setLoadingBusinesses(false);
      });
  }, []);

  const selectedBusiness = businesses.find((business) => business.id === businessId) || null;

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const lineTotals = calculateLine(item);
        acc.subtotal += lineTotals.base;
        acc.discount += Number(item.discount || 0);
        acc.tax += lineTotals.tax;
        acc.total += lineTotals.total;
        return acc;
      },
      {
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0
      }
    );
  }, [items]);

  function updateLine(index: number, patch: Partial<Line>) {
    setItems((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    );
  }

  function removeLine(index: number) {
    setItems((current) => {
      if (current.length === 1) return current;
      return current.filter((_, lineIndex) => lineIndex !== index);
    });
  }

  async function suggest(index: number) {
    const line = items[index];

    if (!line.description.trim()) {
      updateLine(index, {
        suggestions: [],
        hsCodeId: null,
        hsLabel: ''
      });
      return;
    }

    updateLine(index, {
      suggesting: true
    });

    try {
      const response = await fetch('/api/hs-codes/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: line.description,
          limit: 4
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not suggest HS/PCT codes');
      }

      updateLine(index, {
        suggestions: data.suggestions || [],
        suggesting: false
      });
    } catch (err) {
      updateLine(index, {
        suggestions: [],
        suggesting: false
      });

      setNotice(
        err instanceof Error
          ? err.message
          : 'HS/PCT suggestion failed. You can still save and review manually.'
      );
    }
  }

  function selectSuggestion(index: number, suggestion: HsSuggestion) {
    updateLine(index, {
      hsCodeId: suggestion.id,
      hsLabel: `${suggestion.displayCode} - ${suggestion.description}`,
      suggestions: []
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!businessId) {
      setError('Please select a client business before saving.');
      return;
    }

    const invalidLine = items.find((item) => !item.description.trim());

    if (invalidLine) {
      setError('Every invoice line needs a description.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessId,
          buyerName,
          buyerNtn,
          buyerStrn,
          buyerCnic,
          buyerAddress,
          items: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
            hsCodeId: item.hsCodeId || null
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invoice');
      }

      router.push(`/invoices/${data.invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppNav />

      <main className="container">
        <form onSubmit={save}>
          <section className="dashboard-hero">
            <div>
              <span className="eyebrow">Create invoice</span>
              <h1>Draft a client invoice</h1>
              <p>
                Prepare an invoice for a ProBiz client business, review buyer details, choose
                HS/PCT suggestions, and keep tax fields editable before mock FBR submission.
              </p>

              <div className="hero-actions">
                <button className="btn" type="submit" disabled={saving || loadingBusinesses}>
                  {saving ? 'Saving invoice...' : 'Save invoice'}
                </button>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => setItems((current) => [...current, newLine()])}
                >
                  Add line
                </button>
              </div>
            </div>

            <div className="workspace-card">
              <div className="workspace-topline">Invoice total</div>
              <h2>{money(totals.total)}</h2>
              <div className="workspace-list">
                <div>
                  <span>Subtotal</span>
                  <strong>{money(totals.subtotal)}</strong>
                </div>
                <div>
                  <span>Discount</span>
                  <strong>{money(totals.discount)}</strong>
                </div>
                <div>
                  <span>Sales tax</span>
                  <strong>{money(totals.tax)}</strong>
                </div>
              </div>
              <span className="mode-pill">Mock FBR mode</span>
            </div>
          </section>

          {error ? (
            <div className="alert danger">
              <strong>Invoice could not be saved.</strong>
              <span>{error}</span>
            </div>
          ) : null}

          {notice ? (
            <div className="note-panel">
              <strong>Notice:</strong>
              <span>{notice}</span>
            </div>
          ) : null}

          <section className="grid grid-3 dashboard-sections">
            <div className="card card-pad">
              <span className="eyebrow">Client business</span>
              <h2>Seller profile</h2>
              <p>Select the business under ProBiz for which this invoice is being prepared.</p>

              <label>
                <span className="label">Business</span>
                <select
                  className="select"
                  value={businessId}
                  onChange={(event) => setBusinessId(event.target.value)}
                  disabled={loadingBusinesses}
                  required
                >
                  <option value="">
                    {loadingBusinesses ? 'Loading businesses...' : 'Select business'}
                  </option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedBusiness ? (
                <div className="checklist" style={{ marginTop: 16 }}>
                  <div>
                    <span className="check ok">✓</span>
                    <p>
                      <strong>{selectedBusiness.name}</strong>
                      <br />
                      NTN: {selectedBusiness.ntn || '-'} | STRN: {selectedBusiness.strn || '-'}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="card card-pad span-2">
              <span className="eyebrow">Buyer details</span>
              <h2>Customer information</h2>
              <p>
                Add buyer registration details where available. These fields should be reviewed
                before any live FBR integration is enabled later.
              </p>

              <div className="grid grid-2" style={{ marginTop: 18 }}>
                <label>
                  <span className="label">Buyer name</span>
                  <input
                    className="input"
                    value={buyerName}
                    onChange={(event) => setBuyerName(event.target.value)}
                    required
                  />
                </label>

                <label>
                  <span className="label">Buyer NTN</span>
                  <input
                    className="input"
                    value={buyerNtn}
                    onChange={(event) => setBuyerNtn(event.target.value)}
                    placeholder="Optional"
                  />
                </label>

                <label>
                  <span className="label">Buyer STRN</span>
                  <input
                    className="input"
                    value={buyerStrn}
                    onChange={(event) => setBuyerStrn(event.target.value)}
                    placeholder="Optional"
                  />
                </label>

                <label>
                  <span className="label">Buyer CNIC</span>
                  <input
                    className="input"
                    value={buyerCnic}
                    onChange={(event) => setBuyerCnic(event.target.value)}
                    placeholder="Optional"
                  />
                </label>

                <label style={{ gridColumn: '1 / -1' }}>
                  <span className="label">Buyer address</span>
                  <textarea
                    className="textarea"
                    value={buyerAddress}
                    onChange={(event) => setBuyerAddress(event.target.value)}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="card card-pad dashboard-sections">
            <div className="section-head">
              <div>
                <span className="eyebrow">Invoice lines</span>
                <h2>Products and services</h2>
              </div>
              <button
                className="btn secondary small"
                type="button"
                onClick={() => setItems((current) => [...current, newLine()])}
              >
                Add line
              </button>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              {items.map((line, index) => {
                const lineTotals = calculateLine(line);

                return (
                  <div key={index} className="card card-pad" style={{ background: '#f8fafc' }}>
                    <div className="between">
                      <div>
                        <span className="eyebrow">Line {index + 1}</span>
                        <h3>{line.description || 'New invoice line'}</h3>
                      </div>

                      <div className="row">
                        <span className="badge info">{money(lineTotals.total)}</span>
                        <button
                          className="btn ghost small"
                          type="button"
                          onClick={() => removeLine(index)}
                          disabled={items.length === 1}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-4" style={{ marginTop: 16 }}>
                      <label style={{ gridColumn: 'span 2' }}>
                        <span className="label">Description</span>
                        <input
                          className="input"
                          value={line.description}
                          onChange={(event) =>
                            updateLine(index, {
                              description: event.target.value,
                              hsCodeId: null,
                              hsLabel: ''
                            })
                          }
                          onBlur={() => suggest(index)}
                          placeholder="e.g. cotton fabric"
                          required
                        />
                      </label>

                      <label>
                        <span className="label">Qty</span>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(index, {
                              quantity: Number(event.target.value)
                            })
                          }
                        />
                      </label>

                      <label>
                        <span className="label">Unit</span>
                        <input
                          className="input"
                          value={line.unit}
                          onChange={(event) =>
                            updateLine(index, {
                              unit: event.target.value
                            })
                          }
                        />
                      </label>

                      <label>
                        <span className="label">Unit price</span>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(event) =>
                            updateLine(index, {
                              unitPrice: Number(event.target.value)
                            })
                          }
                        />
                      </label>

                      <label>
                        <span className="label">Discount</span>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.discount}
                          onChange={(event) =>
                            updateLine(index, {
                              discount: Number(event.target.value)
                            })
                          }
                        />
                      </label>

                      <label>
                        <span className="label">Tax rate %</span>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.taxRate}
                          onChange={(event) =>
                            updateLine(index, {
                              taxRate: Number(event.target.value)
                            })
                          }
                        />
                      </label>

                      <label>
                        <span className="label">Line tax</span>
                        <input className="input" value={money(lineTotals.tax)} disabled readOnly />
                      </label>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <div className="between">
                        <div>
                          <span className="label">Selected HS/PCT suggestion</span>
                          <p style={{ marginBottom: 0 }}>
                            {line.hsLabel ||
                              'No HS/PCT code selected yet. Click suggest or leave blank for auto suggestion.'}
                          </p>
                        </div>

                        <button
                          className="btn ghost small"
                          type="button"
                          onClick={() => suggest(index)}
                          disabled={line.suggesting}
                        >
                          {line.suggesting ? 'Suggesting...' : 'Suggest HS/PCT'}
                        </button>
                      </div>

                      {line.suggestions?.length ? (
                        <div className="grid grid-2" style={{ marginTop: 12 }}>
                          {line.suggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              className="card card-pad"
                              type="button"
                              onClick={() => selectSuggestion(index, suggestion)}
                              style={{
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              <span className="badge info">
                                {suggestion.displayCode}
                                {suggestion.confidence
                                  ? ` | ${suggestion.confidence}% match`
                                  : ''}
                              </span>
                              <h3 style={{ marginTop: 12 }}>{suggestion.description}</h3>
                              <p style={{ marginBottom: 0 }}>
                                CD%: {suggestion.customsDuty || '-'} | Review before use
                              </p>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="note-panel">
            <strong>Review boundary:</strong>
            <span>
              HS/PCT, tax rate, UOM, exemption, and FBR scenario mapping should stay configurable
              and reviewed. CD% should not be treated as sales tax automatically.
            </span>
          </section>
        </form>
      </main>
    </>
  );
}
