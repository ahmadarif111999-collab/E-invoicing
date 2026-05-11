'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppNav } from '@/components/AppNav';

type BusinessRow = {
  id: string;
  name: string;
  ntn?: string | null;
  strn?: string | null;
  address?: string | null;
  invoicePrefix: string;
  sequenceNext: number;
  createdAt: string;
  invoiceCount?: number;
  acceptedCount?: number;
  rejectedCount?: number;
  customerCount?: number;
  productCount?: number;
  totalGrandValue?: number;
  totalTaxValue?: number;
};

type BusinessesResponse = {
  businesses: BusinessRow[];
  firm?: {
    role: string | null;
  };
  canCreateBusiness?: boolean;
};

const pkrFormatter = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 0
});

function money(value: string | number | null | undefined) {
  return pkrFormatter.format(Number(value || 0));
}

function compactNumber(value: string | number | null | undefined) {
  return Number(value || 0).toLocaleString('en-PK');
}

function formatDate(value?: string) {
  if (!value) return '-';

  return new Date(value).toLocaleDateString('en-PK', {
    dateStyle: 'medium'
  });
}

function formatRole(role?: string | null) {
  if (!role) return 'Firm user';

  return role
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [firmRole, setFirmRole] = useState<string | null>(null);
  const [canCreateBusiness, setCanCreateBusiness] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');

  const [form, setForm] = useState({
    name: '',
    ntn: '',
    strn: '',
    address: '',
    invoicePrefix: 'INV'
  });

  async function loadBusinesses() {
    setError('');

    try {
      const response = await fetch('/api/businesses');
      const data = (await response.json()) as BusinessesResponse;

      if (!response.ok) {
        throw new Error((data as any).error || 'Failed to load businesses');
      }

      setBusinesses(data.businesses || []);
      setFirmRole(data.firm?.role || null);
      setCanCreateBusiness(Boolean(data.canCreateBusiness));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBusinesses();
  }, []);

  function updateForm(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function createBusiness(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!form.name.trim()) {
      setError('Client business name is required.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create business');
      }

      setBusinesses((current) => [data.business, ...current]);
      setForm({
        name: '',
        ntn: '',
        strn: '',
        address: '',
        invoicePrefix: 'INV'
      });
      setNotice('Client business created successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business');
    } finally {
      setSaving(false);
    }
  }

  const filteredBusinesses = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    if (!loweredQuery) return businesses;

    return businesses.filter((business) => {
      const haystack = [
        business.name,
        business.ntn || '',
        business.strn || '',
        business.address || '',
        business.invoicePrefix || ''
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(loweredQuery);
    });
  }, [businesses, query]);

  const totals = useMemo(() => {
    return filteredBusinesses.reduce(
      (acc, business) => {
        acc.invoiceCount += Number(business.invoiceCount || 0);
        acc.customerCount += Number(business.customerCount || 0);
        acc.productCount += Number(business.productCount || 0);
        acc.totalGrandValue += Number(business.totalGrandValue || 0);
        acc.totalTaxValue += Number(business.totalTaxValue || 0);
        acc.acceptedCount += Number(business.acceptedCount || 0);
        acc.rejectedCount += Number(business.rejectedCount || 0);
        return acc;
      },
      {
        invoiceCount: 0,
        customerCount: 0,
        productCount: 0,
        totalGrandValue: 0,
        totalTaxValue: 0,
        acceptedCount: 0,
        rejectedCount: 0
      }
    );
  }, [filteredBusinesses]);

  return (
    <>
      <AppNav />

      <main className="container">
        <section className="dashboard-hero">
          <div>
            <span className="eyebrow">Client business master</span>
            <h1>Manage ProBiz client businesses</h1>
            <p>
              Add and review client businesses handled by the ProBiz firm workspace. These business
              profiles are used for invoice numbering, seller details, reports, and mock FBR
              workflow testing.
            </p>

            <div className="hero-actions">
              <Link className="btn" href="/invoices/new">
                Create invoice
              </Link>
              <Link className="btn secondary" href="/reports">
                View reports
              </Link>
            </div>
          </div>

          <div className="workspace-card">
            <div className="workspace-topline">Workspace role</div>
            <h2>{formatRole(firmRole)}</h2>
            <div className="workspace-list">
              <div>
                <span>Client businesses</span>
                <strong>{compactNumber(filteredBusinesses.length)}</strong>
              </div>
              <div>
                <span>Total invoices</span>
                <strong>{compactNumber(totals.invoiceCount)}</strong>
              </div>
              <div>
                <span>Invoice value</span>
                <strong>{money(totals.totalGrandValue)}</strong>
              </div>
            </div>
            <span className="mode-pill">ProBiz-only access</span>
          </div>
        </section>

        {error ? (
          <div className="alert danger">
            <strong>Business workspace issue</strong>
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div className="note-panel">
            <strong>Done:</strong>
            <span>{notice}</span>
          </div>
        ) : null}

        <section className="grid grid-4">
          <div className="kpi-card info">
            <div className="kpi-label">Client businesses</div>
            <div className="kpi-value">{compactNumber(filteredBusinesses.length)}</div>
            <div className="kpi-helper">Businesses visible to your ProBiz user</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Invoices</div>
            <div className="kpi-value">{compactNumber(totals.invoiceCount)}</div>
            <div className="kpi-helper">Invoices across filtered businesses</div>
          </div>

          <div className="kpi-card warning">
            <div className="kpi-label">Sales tax</div>
            <div className="kpi-value">{money(totals.totalTaxValue)}</div>
            <div className="kpi-helper">Recorded sales tax in mock workflow</div>
          </div>

          <div className="kpi-card success">
            <div className="kpi-label">Mock accepted</div>
            <div className="kpi-value">{compactNumber(totals.acceptedCount)}</div>
            <div className="kpi-helper">Accepted invoices in mock FBR mode</div>
          </div>
        </section>

        <section className="grid grid-3 dashboard-sections">
          <form className="card card-pad" onSubmit={createBusiness}>
            <span className="eyebrow">Add client business</span>
            <h2>New business profile</h2>
            <p>
              Create a client business under the ProBiz firm. Client login remains disabled for now.
            </p>

            <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
              <label>
                <span className="label">Business name</span>
                <input
                  className="input"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="e.g. XYZ Traders Pvt Ltd"
                  disabled={!canCreateBusiness || saving}
                  required
                />
              </label>

              <div className="grid grid-2">
                <label>
                  <span className="label">NTN</span>
                  <input
                    className="input"
                    value={form.ntn}
                    onChange={(event) => updateForm('ntn', event.target.value)}
                    placeholder="Optional"
                    disabled={!canCreateBusiness || saving}
                  />
                </label>

                <label>
                  <span className="label">STRN</span>
                  <input
                    className="input"
                    value={form.strn}
                    onChange={(event) => updateForm('strn', event.target.value)}
                    placeholder="Optional"
                    disabled={!canCreateBusiness || saving}
                  />
                </label>
              </div>

              <label>
                <span className="label">Invoice prefix</span>
                <input
                  className="input"
                  value={form.invoicePrefix}
                  onChange={(event) => updateForm('invoicePrefix', event.target.value)}
                  placeholder="e.g. ABC"
                  maxLength={8}
                  disabled={!canCreateBusiness || saving}
                />
              </label>

              <label>
                <span className="label">Business address</span>
                <textarea
                  className="textarea"
                  value={form.address}
                  onChange={(event) => updateForm('address', event.target.value)}
                  placeholder="City, province, Pakistan"
                  disabled={!canCreateBusiness || saving}
                />
              </label>

              <button className="btn" type="submit" disabled={!canCreateBusiness || saving}>
                {saving ? 'Creating...' : 'Create business'}
              </button>
            </div>

            {!canCreateBusiness ? (
              <div className="note-panel" style={{ marginTop: 16 }}>
                <strong>Restricted:</strong>
                <span>Only ProBiz owner, partner, or accountant roles can add businesses.</span>
              </div>
            ) : null}
          </form>

          <div className="card card-pad span-2">
            <div className="section-head">
              <div>
                <span className="eyebrow">Business register</span>
                <h2>Client business list</h2>
              </div>
              <span className="badge info">{compactNumber(businesses.length)} total</span>
            </div>

            <label>
              <span className="label">Search businesses</span>
              <input
                className="input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, NTN, STRN, address, or prefix"
              />
            </label>

            <div style={{ marginTop: 20 }}>
              {loading ? (
                <div className="loading-panel">
                  <div>
                    <div className="loader" />
                    <p>Loading businesses...</p>
                  </div>
                </div>
              ) : filteredBusinesses.length === 0 ? (
                <div className="empty-state">
                  <h3>No businesses found</h3>
                  <p>Create the first client business or adjust your search.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Business</th>
                        <th>Registration</th>
                        <th>Prefix</th>
                        <th>Invoices</th>
                        <th>Value</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBusinesses.map((business) => (
                        <tr key={business.id}>
                          <td>
                            <strong>{business.name}</strong>
                            <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                              {business.address || 'Address not recorded'}
                            </p>
                          </td>
                          <td>
                            <p style={{ margin: 0 }}>NTN: {business.ntn || '-'}</p>
                            <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                              STRN: {business.strn || '-'}
                            </p>
                          </td>
                          <td>
                            <span className="badge neutral">{business.invoicePrefix}</span>
                          </td>
                          <td>{compactNumber(business.invoiceCount)}</td>
                          <td className="amount-cell">{money(business.totalGrandValue)}</td>
                          <td>{formatDate(business.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-3 dashboard-sections">
          <div className="card card-pad">
            <span className="eyebrow">Access boundary</span>
            <h2>Clients do not log in yet</h2>
            <p>
              These client businesses are managed by ProBiz partners. A restricted client portal can
              be added later after permission checks are fully hardened.
            </p>
          </div>

          <div className="card card-pad">
            <span className="eyebrow">Invoice numbering</span>
            <h2>Prefix per business</h2>
            <p>
              Each business has its own invoice prefix and sequence counter, helping keep client
              invoice series separate inside the firm workspace.
            </p>
          </div>

          <div className="card card-pad">
            <span className="eyebrow">Next master data</span>
            <h2>Customers and products</h2>
            <p>
              The next batch can add buyer/customer master and product/service master with default
              HS/PCT code, UOM, and tax rate.
            </p>
          </div>
        </section>

        <section className="note-panel">
          <strong>Compliance boundary:</strong>
          <span>
            Business profiles are for MVP/demo testing while FBR mode remains mock. Do not use real
            client data until security, tenant isolation, and audit logging are verified.
          </span>
        </section>
      </main>
    </>
  );
}
