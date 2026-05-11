'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppNav } from '@/components/AppNav';

type Invoice = {
  id: string;
  invoiceNumber: string;
  buyerName: string;
  status: string;
  grandTotal: string | number;
  taxTotal?: string | number;
  fbrInvoiceNumber?: string | null;
  createdAt?: string;
  business?: {
    id: string;
    name: string;
  };
};

type Business = {
  id: string;
  name: string;
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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [businessFilter, setBusinessFilter] = useState('ALL');

  useEffect(() => {
    fetch('/api/invoices')
      .then(async (response) => {
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error || 'Failed to load invoices');
        }

        setInvoices(body.invoices || []);
        setBusinesses(body.businesses || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load invoices');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filteredInvoices = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesStatus = statusFilter === 'ALL' || invoice.status === statusFilter;
      const matchesBusiness =
        businessFilter === 'ALL' || invoice.business?.id === businessFilter;

      const haystack = [
        invoice.invoiceNumber,
        invoice.buyerName,
        invoice.status,
        invoice.fbrInvoiceNumber || '',
        invoice.business?.name || ''
      ]
        .join(' ')
        .toLowerCase();

      const matchesQuery = !loweredQuery || haystack.includes(loweredQuery);

      return matchesStatus && matchesBusiness && matchesQuery;
    });
  }, [businessFilter, invoices, query, statusFilter]);

  const totalValue = filteredInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.grandTotal || 0),
    0
  );

  const acceptedCount = filteredInvoices.filter(
    (invoice) => invoice.status === 'ACCEPTED_BY_FBR'
  ).length;

  const rejectedCount = filteredInvoices.filter((invoice) =>
    ['REJECTED_BY_FBR', 'FAILED'].includes(invoice.status)
  ).length;

  return (
    <>
      <AppNav />

      <main className="container">
        <section className="dashboard-hero">
          <div>
            <span className="eyebrow">Invoice register</span>
            <h1>Client invoices</h1>
            <p>
              Review all invoices created by ProBiz partners, filter by status or client business,
              and track mock FBR submission references.
            </p>

            <div className="hero-actions">
              <Link className="btn" href="/invoices/new">
                Create invoice
              </Link>
              <Link className="btn secondary" href="/hs-codes">
                Search HS/PCT codes
              </Link>
            </div>
          </div>

          <div className="workspace-card">
            <div className="workspace-topline">Current register</div>
            <h2>{filteredInvoices.length.toLocaleString('en-PK')} invoices</h2>
            <div className="workspace-list">
              <div>
                <span>Filtered value</span>
                <strong>{money(totalValue)}</strong>
              </div>
              <div>
                <span>Mock accepted</span>
                <strong>{acceptedCount.toLocaleString('en-PK')}</strong>
              </div>
              <div>
                <span>Needs correction</span>
                <strong>{rejectedCount.toLocaleString('en-PK')}</strong>
              </div>
            </div>
            <span className="mode-pill">Mock FBR mode active</span>
          </div>
        </section>

        {error ? (
          <div className="alert danger">
            <strong>Invoices could not load.</strong>
            <span>{error}</span>
          </div>
        ) : null}

        <section className="card card-pad">
          <div className="section-head">
            <div>
              <span className="eyebrow">Search and filter</span>
              <h2>Invoice workspace</h2>
            </div>
            <span className="badge info">{invoices.length.toLocaleString('en-PK')} total</span>
          </div>

          <div className="grid grid-3" style={{ marginBottom: 20 }}>
            <label>
              <span className="label">Search invoice, buyer, reference</span>
              <input
                className="input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. ABC-000001, Retail House, MOCK"
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

            <label>
              <span className="label">Client business</span>
              <select
                className="select"
                value={businessFilter}
                onChange={(event) => setBusinessFilter(event.target.value)}
              >
                <option value="ALL">All businesses</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="loading-panel">
              <div>
                <div className="loader" />
                <p>Loading invoices...</p>
              </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="empty-state">
              <h3>No invoices found</h3>
              <p>
                Try changing your filters or create a new invoice for one of the ProBiz client
                businesses.
              </p>
              <Link className="btn" href="/invoices/new">
                Create invoice
              </Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Business</th>
                    <th>Buyer</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Mock FBR ref</th>
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
                      <td>{invoice.business?.name || '-'}</td>
                      <td>{invoice.buyerName}</td>
                      <td>
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="amount-cell">{money(invoice.grandTotal)}</td>
                      <td>{invoice.fbrInvoiceNumber || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="note-panel">
          <strong>Reminder:</strong>
          <span>
            Invoice statuses and references shown here are mock workflow records. They are useful
            for testing the product, but they are not official FBR submission confirmations.
          </span>
        </section>
      </main>
    </>
  );
}
