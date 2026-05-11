'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppNav } from '@/components/AppNav';

type ReportInvoice = {
  id: string;
  invoiceNumber: string;
  buyerName: string;
  status: string;
  taxTotal: string | number;
  grandTotal: string | number;
  issueDate?: string;
  business?: {
    id: string;
    name: string;
  };
  items?: Array<{
    id: string;
    lineTotal: string | number;
    taxAmount: string | number;
  }>;
};

type ReportsData = {
  salesTotal: number;
  taxTotal: number;
  pending: number;
  accepted: number;
  rejected: number;
  invoices: ReportInvoice[];
};

const pkrFormatter = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 0
});

const statusOptions = [
  'ALL',
  'DRAFT',
  'READY_FOR_REVIEW',
  'VALIDATED',
  'SUBMISSION_PENDING',
  'SUBMITTED',
  'ACCEPTED_BY_FBR',
  'REJECTED_BY_FBR',
  'FAILED'
];

function money(value: string | number | null | undefined) {
  return pkrFormatter.format(Number(value || 0));
}

function formatStatus(status: string) {
  return status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusTone(status: string) {
  if (status.includes('ACCEPTED')) return 'ok';
  if (status.includes('REJECTED') || status.includes('FAILED') || status.includes('CANCELLED')) {
    return 'danger';
  }
  if (status.includes('PENDING') || status.includes('SUBMITTED') || status.includes('REVIEW')) {
    return 'warn';
  }
  if (status.includes('VALIDATED')) return 'info';
  return 'neutral';
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${getStatusTone(status)}`}>{formatStatus(status)}</span>;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-PK', {
    dateStyle: 'medium'
  });
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/reports')
      .then(async (response) => {
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error || 'Failed to load reports');
        }

        setData(body);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      });
  }, []);

  const filteredInvoices = useMemo(() => {
    if (!data) return [];

    const loweredQuery = query.trim().toLowerCase();

    return data.invoices.filter((invoice) => {
      const matchesStatus = statusFilter === 'ALL' || invoice.status === statusFilter;
      const haystack = [
        invoice.invoiceNumber,
        invoice.buyerName,
        invoice.status,
        invoice.business?.name || ''
      ]
        .join(' ')
        .toLowerCase();

      const matchesQuery = !loweredQuery || haystack.includes(loweredQuery);

      return matchesStatus && matchesQuery;
    });
  }, [data, query, statusFilter]);

  const filteredTotals = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, invoice) => {
        acc.salesTotal += Number(invoice.grandTotal || 0);
        acc.taxTotal += Number(invoice.taxTotal || 0);

        if (['DRAFT', 'READY_FOR_REVIEW', 'VALIDATED'].includes(invoice.status)) {
          acc.pending += 1;
        }

        if (invoice.status === 'ACCEPTED_BY_FBR') {
          acc.accepted += 1;
        }

        if (['REJECTED_BY_FBR', 'FAILED'].includes(invoice.status)) {
          acc.rejected += 1;
        }

        return acc;
      },
      {
        salesTotal: 0,
        taxTotal: 0,
        pending: 0,
        accepted: 0,
        rejected: 0
      }
    );
  }, [filteredInvoices]);

  const businessCount = useMemo(() => {
    const businessIds = new Set(filteredInvoices.map((invoice) => invoice.business?.id).filter(Boolean));
    return businessIds.size;
  }, [filteredInvoices]);

  const acceptedRate =
    filteredTotals.accepted + filteredTotals.rejected === 0
      ? 0
      : Math.round(
          (filteredTotals.accepted / (filteredTotals.accepted + filteredTotals.rejected)) * 100
        );

  return (
    <>
      <AppNav />

      <main className="container">
        <section className="dashboard-hero">
          <div>
            <span className="eyebrow">Reports</span>
            <h1>Sales and tax summary</h1>
            <p>
              Review invoice totals, sales tax values, pending work, accepted mock submissions, and
              rejected invoices across accessible ProBiz client businesses.
            </p>

            <div className="hero-actions">
              <Link className="btn" href="/invoices/new">
                Create invoice
              </Link>
              <Link className="btn secondary" href="/invoices">
                View invoice register
              </Link>
            </div>
          </div>

          <div className="workspace-card">
            <div className="workspace-topline">Filtered sales</div>
            <h2>{money(filteredTotals.salesTotal)}</h2>
            <div className="workspace-list">
              <div>
                <span>Sales tax</span>
                <strong>{money(filteredTotals.taxTotal)}</strong>
              </div>
              <div>
                <span>Businesses</span>
                <strong>{businessCount.toLocaleString('en-PK')}</strong>
              </div>
              <div>
                <span>Mock acceptance</span>
                <strong>{acceptedRate.toLocaleString('en-PK')}%</strong>
              </div>
            </div>
            <span className="mode-pill">Mock reporting</span>
          </div>
        </section>

        {error ? (
          <div className="alert danger">
            <strong>Reports could not load.</strong>
            <span>{error}</span>
          </div>
        ) : null}

        {!data ? (
          <div className="loading-panel">
            <div>
              <div className="loader" />
              <p>Loading reports...</p>
            </div>
          </div>
        ) : (
          <>
            <section className="grid grid-4">
              <div className="kpi-card info">
                <div className="kpi-label">Sales total</div>
                <div className="kpi-value">{money(filteredTotals.salesTotal)}</div>
                <div className="kpi-helper">Grand invoice value in current filter</div>
              </div>

              <div className="kpi-card warning">
                <div className="kpi-label">Tax total</div>
                <div className="kpi-value">{money(filteredTotals.taxTotal)}</div>
                <div className="kpi-helper">Recorded sales tax on invoices</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-label">Pending invoices</div>
                <div className="kpi-value">{filteredTotals.pending.toLocaleString('en-PK')}</div>
                <div className="kpi-helper">Draft, ready, or validated invoices</div>
              </div>

              <div className="kpi-card success">
                <div className="kpi-label">Mock accepted</div>
                <div className="kpi-value">{filteredTotals.accepted.toLocaleString('en-PK')}</div>
                <div className="kpi-helper">Invoices accepted in mock workflow</div>
              </div>
            </section>

            <section className="card card-pad dashboard-sections">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Report filters</span>
                  <h2>Invoice summary table</h2>
                </div>
                <span className="badge info">
                  {filteredInvoices.length.toLocaleString('en-PK')} invoices
                </span>
              </div>

              <div className="grid grid-2" style={{ marginBottom: 20 }}>
                <label>
                  <span className="label">Search invoice, buyer, business</span>
                  <input
                    className="input"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="e.g. ABC-000001, Retail House"
                  />
                </label>

                <label>
                  <span className="label">Status</span>
                  <select
                    className="select"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status === 'ALL' ? 'All statuses' : formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {filteredInvoices.length === 0 ? (
                <div className="empty-state">
                  <h3>No invoices match this report</h3>
                  <p>Try a different search or status filter.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th>Business</th>
                        <th>Buyer</th>
                        <th>Status</th>
                        <th>Tax</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td>
                            <Link className="table-link" href={`/invoices/${invoice.id}`}>
                              {invoice.invoiceNumber}
                            </Link>
                          </td>
                          <td>{formatDate(invoice.issueDate)}</td>
                          <td>{invoice.business?.name || '-'}</td>
                          <td>{invoice.buyerName}</td>
                          <td>
                            <StatusBadge status={invoice.status} />
                          </td>
                          <td>{money(invoice.taxTotal)}</td>
                          <td className="amount-cell">{money(invoice.grandTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="grid grid-3 dashboard-sections">
              <div className="card card-pad">
                <span className="eyebrow">Tax review</span>
                <h2>What this report means</h2>
                <p>
                  This report summarizes invoice values already stored in the app. It does not
                  replace tax review, official FBR acknowledgements, or licensed-integrator
                  reporting.
                </p>
              </div>

              <div className="card card-pad">
                <span className="eyebrow">Mock flow</span>
                <h2>Accepted vs rejected</h2>
                <p>
                  Mock acceptance helps test workflow quality. Rejected or failed invoices should
                  be corrected before any future live submission process is considered.
                </p>
              </div>

              <div className="card card-pad">
                <span className="eyebrow">Next report ideas</span>
                <h2>Future reports</h2>
                <p>
                  Later we can add customer-wise sales, product-wise sales, province-wise sales,
                  FBR submission logs, and Excel/PDF export.
                </p>
              </div>
            </section>
          </>
        )}

        <section className="note-panel">
          <strong>Boundary:</strong>
          <span>
            These reports are for MVP/demo testing only while FBR mode remains mock. Do not use
            them as official statutory filing records.
          </span>
        </section>
      </main>
    </>
  );
}
