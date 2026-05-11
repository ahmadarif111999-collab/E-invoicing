'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppNav } from '@/components/AppNav';

type InvoiceItem = {
  id: string;
  description: string;
  quantity: string | number;
  unit: string;
  unitPrice: string | number;
  discount: string | number;
  taxRate: string | number;
  taxAmount: string | number;
  lineTotal: string | number;
  hsCode?: {
    id: string;
    displayCode: string;
    description: string;
    customsDuty?: string | null;
  } | null;
};

type Submission = {
  id: string;
  mode: string;
  status: string;
  referenceNumber?: string | null;
  createdAt: string;
  errorPayload?: any;
  responsePayload?: any;
};

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  buyerName: string;
  buyerNtn?: string | null;
  buyerStrn?: string | null;
  buyerCnic?: string | null;
  buyerAddress?: string | null;
  subtotal: string | number;
  discountTotal: string | number;
  taxTotal: string | number;
  grandTotal: string | number;
  fbrInvoiceNumber?: string | null;
  fbrResponse?: any;
  business: {
    id: string;
    name: string;
    ntn?: string | null;
    strn?: string | null;
    address?: string | null;
  };
  items: InvoiceItem[];
  submissions: Submission[];
  auditLogs: AuditLog[];
};

const pkrFormatter = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 0
});

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
  return new Date(value).toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadInvoice() {
    setError('');

    try {
      const response = await fetch(`/api/invoices/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load invoice');
      }

      setInvoice(data.invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function submitMock() {
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`/api/invoices/${params.id}/submit`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      if (data.accepted) {
        setMessage('Mock FBR submission accepted. This is not a real FBR confirmation.');
      } else {
        setMessage(
          `Mock FBR rejected: ${(data.validationErrors || ['Validation failed']).join(', ')}`
        );
      }

      await loadInvoice();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  const missingHsCount = useMemo(() => {
    return invoice?.items.filter((item) => !item.hsCode).length || 0;
  }, [invoice]);

  const canSubmit = invoice
    ? !['ACCEPTED_BY_FBR', 'CANCELLED', 'CREDIT_NOTE_ISSUED', 'DEBIT_NOTE_ISSUED'].includes(
        invoice.status
      )
    : false;

  return (
    <>
      <AppNav />

      <main className="container">
        {error ? (
          <div className="alert danger">
            <strong>Invoice issue</strong>
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="loading-panel">
            <div>
              <div className="loader" />
              <p>Loading invoice...</p>
            </div>
          </div>
        ) : !invoice ? (
          <div className="empty-state">
            <h3>Invoice not found</h3>
            <p>The invoice could not be loaded or your user does not have access to it.</p>
            <Link className="btn" href="/invoices">
              Back to invoices
            </Link>
          </div>
        ) : (
          <>
            <section className="dashboard-hero">
              <div>
                <span className="eyebrow">Invoice detail</span>
                <h1>{invoice.invoiceNumber}</h1>
                <p>
                  Review buyer information, HS/PCT classifications, invoice totals, mock FBR
                  submission result, and audit activity for this invoice.
                </p>

                <div className="hero-actions">
                  <button
                    className="btn"
                    type="button"
                    onClick={submitMock}
                    disabled={submitting || !canSubmit}
                  >
                    {submitting ? 'Submitting...' : 'Submit to mock FBR'}
                  </button>
                  <Link className="btn secondary" href="/invoices">
                    Back to invoices
                  </Link>
                </div>

                {message ? (
                  <div className="note-panel" style={{ marginTop: 18 }}>
                    <strong>Submission result:</strong>
                    <span>{message}</span>
                  </div>
                ) : null}
              </div>

              <div className="workspace-card">
                <div className="workspace-topline">Current status</div>
                <h2>{money(invoice.grandTotal)}</h2>
                <div className="workspace-list">
                  <div>
                    <span>Status</span>
                    <strong>
                      <StatusBadge status={invoice.status} />
                    </strong>
                  </div>
                  <div>
                    <span>Mock FBR ref</span>
                    <strong>{invoice.fbrInvoiceNumber || '-'}</strong>
                  </div>
                  <div>
                    <span>Missing HS/PCT</span>
                    <strong>{missingHsCount.toLocaleString('en-PK')}</strong>
                  </div>
                </div>
                <span className="mode-pill">Mock workflow</span>
              </div>
            </section>

            <section className="grid grid-3 dashboard-sections">
              <div className="card card-pad">
                <span className="eyebrow">Seller</span>
                <h2>{invoice.business.name}</h2>
                <div className="checklist">
                  <div>
                    <span className="check ok">✓</span>
                    <p>NTN: {invoice.business.ntn || '-'}</p>
                  </div>
                  <div>
                    <span className="check ok">✓</span>
                    <p>STRN: {invoice.business.strn || '-'}</p>
                  </div>
                  <div>
                    <span className="check warn">!</span>
                    <p>{invoice.business.address || 'Business address not recorded'}</p>
                  </div>
                </div>
              </div>

              <div className="card card-pad">
                <span className="eyebrow">Buyer</span>
                <h2>{invoice.buyerName}</h2>
                <div className="checklist">
                  <div>
                    <span className="check ok">✓</span>
                    <p>NTN: {invoice.buyerNtn || '-'}</p>
                  </div>
                  <div>
                    <span className="check ok">✓</span>
                    <p>STRN: {invoice.buyerStrn || '-'}</p>
                  </div>
                  <div>
                    <span className="check warn">!</span>
                    <p>{invoice.buyerAddress || 'Buyer address not recorded'}</p>
                  </div>
                </div>
              </div>

              <div className="card card-pad">
                <span className="eyebrow">Totals</span>
                <h2>{money(invoice.grandTotal)}</h2>
                <div className="workspace-list">
                  <div>
                    <span>Subtotal</span>
                    <strong>{money(invoice.subtotal)}</strong>
                  </div>
                  <div>
                    <span>Discount</span>
                    <strong>{money(invoice.discountTotal)}</strong>
                  </div>
                  <div>
                    <span>Sales tax</span>
                    <strong>{money(invoice.taxTotal)}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="card card-pad dashboard-sections">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Invoice lines</span>
                  <h2>Products and services</h2>
                </div>
                <span className="badge warn">Review HS/PCT before live use</span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>HS/PCT</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Unit price</th>
                      <th>Tax</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>
                          {item.hsCode ? (
                            <>
                              <strong>{item.hsCode.displayCode}</strong>
                              <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                                {item.hsCode.description}
                              </p>
                            </>
                          ) : (
                            <span className="badge danger">Missing</span>
                          )}
                        </td>
                        <td>{Number(item.quantity).toLocaleString('en-PK')}</td>
                        <td>{item.unit}</td>
                        <td>{money(item.unitPrice)}</td>
                        <td>{money(item.taxAmount)}</td>
                        <td className="amount-cell">{money(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid grid-2 dashboard-sections">
              <div className="card card-pad">
                <div className="section-head compact">
                  <div>
                    <span className="eyebrow">Submission history</span>
                    <h2>Mock FBR activity</h2>
                  </div>
                </div>

                {invoice.submissions.length === 0 ? (
                  <div className="empty-state">
                    <h3>No submissions yet</h3>
                    <p>Submit this invoice to the mock FBR workflow when it is ready.</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Reference</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.submissions.map((submission) => (
                          <tr key={submission.id}>
                            <td>
                              <StatusBadge status={submission.status} />
                            </td>
                            <td>{submission.referenceNumber || '-'}</td>
                            <td>{formatDate(submission.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card card-pad">
                <div className="section-head compact">
                  <div>
                    <span className="eyebrow">Audit trail</span>
                    <h2>Recent actions</h2>
                  </div>
                </div>

                {invoice.auditLogs.length === 0 ? (
                  <div className="empty-state">
                    <h3>No audit events</h3>
                    <p>Invoice actions will appear here when recorded.</p>
                  </div>
                ) : (
                  <div className="focus-list">
                    {invoice.auditLogs.map((log) => (
                      <div className="focus-item" key={log.id}>
                        <strong>•</strong>
                        <div>
                          <h3>{formatStatus(log.action)}</h3>
                          <p>
                            {log.entityType} | {formatDate(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="note-panel">
              <strong>Important:</strong>
              <span>
                This page shows mock FBR submission activity only. It is not an official FBR
                acknowledgement, licensed-integrator confirmation, or production tax record.
              </span>
            </section>
          </>
        )}
      </main>
    </>
  );
}
