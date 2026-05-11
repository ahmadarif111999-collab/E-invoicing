'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppNav } from '@/components/AppNav';

type Business = {
  id: string;
  name: string;
  ntn?: string | null;
  strn?: string | null;
};

type RecentInvoice = {
  id: string;
  invoiceNumber: string;
  buyerName: string;
  status: string;
  grandTotal: string | number;
  taxTotal?: string | number;
  createdAt?: string;
  business: {
    id: string;
    name: string;
  };
};

type DashboardData = {
  user: {
    name: string;
    email: string;
  };
  firm?: {
    id: string;
    name: string;
    role: string | null;
    partnerCount: number;
  };
  businesses: Business[];
  businessCount: number;
  invoiceCount: number;
  draftCount: number;
  readyForReviewCount: number;
  validatedCount: number;
  submissionPendingCount: number;
  submittedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  failedCount: number;
  auditCount: number;
  totalGrandValue: number;
  totalTaxValue: number;
  acceptanceRate: number;
  recentInvoices: RecentInvoice[];
};

const pkrFormatter = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 0
});

function money(value: string | number | null | undefined) {
  return pkrFormatter.format(Number(value || 0));
}

function compactNumber(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString('en-PK');
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

function KpiCard({
  label,
  value,
  helper,
  tone = 'default'
}: {
  label: string;
  value: string | number;
  helper: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
  return (
    <div className={`kpi-card ${tone}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-helper">{helper}</div>
    </div>
  );
}

function WorkflowCard({
  title,
  count,
  description,
  tone
}: {
  title: string;
  count: number;
  description: string;
  tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger';
}) {
  return (
    <div className={`workflow-card ${tone}`}>
      <div className="between">
        <h3>{title}</h3>
        <span>{compactNumber(count)}</span>
      </div>
      <p>{description}</p>
    </div>
  );
}

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
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      });
  }, []);

  const actionItems = useMemo(() => {
    if (!data) return [];

    const pendingWork =
      data.draftCount +
      data.readyForReviewCount +
      data.validatedCount +
      data.submissionPendingCount +
      data.submittedCount;

    return [
      {
        title: 'Review pending invoice work',
        value: pendingWork,
        text:
          pendingWork > 0
            ? 'Invoices are waiting for review, validation, or mock submission.'
            : 'No pending invoice work in the current workspace.'
      },
      {
        title: 'Check rejected or failed invoices',
        value: data.rejectedCount + data.failedCount,
        text:
          data.rejectedCount + data.failedCount > 0
            ? 'Some invoices need correction before another mock submission.'
            : 'No rejected or failed invoices need attention.'
      },
      {
        title: 'Keep HS/PCT suggestions reviewed',
        value: data.invoiceCount,
        text: 'HS/PCT suggestions are helpful, but final classification should be reviewed.'
      }
    ];
  }, [data]);

  return (
    <>
      <AppNav />

      <main className="container dashboard-page">
        {error ? (
          <div className="alert danger">
            <strong>Dashboard could not load.</strong>
            <span>{error}</span>
          </div>
        ) : null}

        {!data ? (
          <div className="loading-panel">
            <div className="loader" />
            <p>Loading ProBiz workspace...</p>
          </div>
        ) : (
          <>
            <section className="dashboard-hero">
              <div>
                <span className="eyebrow">ProBiz firm workspace</span>
                <h1>Digital invoicing command center</h1>
                <p>
                  Manage client businesses, create FBR-ready invoices, review HS/PCT suggestions,
                  and track mock FBR submission activity from one workspace.
                </p>

                <div className="hero-actions">
                  <Link className="btn" href="/invoices/new">
                    Create invoice
                  </Link>
                  <Link className="btn secondary" href="/hs-codes">
                    Search HS/PCT codes
                  </Link>
                  <Link className="btn ghost" href="/reports">
                    View reports
                  </Link>
                </div>
              </div>

              <div className="workspace-card">
                <div className="workspace-topline">Workspace status</div>
                <h2>{data.firm?.name || 'ProBiz'}</h2>
                <div className="workspace-list">
                  <div>
                    <span>Your role</span>
                    <strong>{data.firm?.role ? formatStatus(data.firm.role) : 'Firm user'}</strong>
                  </div>
                  <div>
                    <span>Partner logins</span>
                    <strong>{compactNumber(data.firm?.partnerCount || 0)}</strong>
                  </div>
                  <div>
                    <span>Client businesses</span>
                    <strong>{compactNumber(data.businessCount)}</strong>
                  </div>
                </div>
                <div className="mode-pill">Mock FBR mode active</div>
              </div>
            </section>

            <section className="grid grid-4">
              <KpiCard
                label="Total invoice value"
                value={money(data.totalGrandValue)}
                helper="Grand total across accessible businesses"
                tone="info"
              />
              <KpiCard
                label="Sales tax total"
                value={money(data.totalTaxValue)}
                helper="Tax amount recorded on invoices"
                tone="warning"
              />
              <KpiCard
                label="Mock accepted"
                value={compactNumber(data.acceptedCount)}
                helper={`${compactNumber(data.acceptanceRate)}% mock acceptance rate`}
                tone="success"
              />
              <KpiCard
                label="Audit events"
                value={compactNumber(data.auditCount)}
                helper="Workspace activity trail"
              />
            </section>

            <section className="grid grid-3 dashboard-sections">
              <div className="card card-pad span-2">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Invoice workflow</span>
                    <h2>Today&apos;s operational view</h2>
                  </div>
                  <span className="badge info">{compactNumber(data.invoiceCount)} total invoices</span>
                </div>

                <div className="workflow-grid">
                  <WorkflowCard
                    title="Draft"
                    count={data.draftCount}
                    description="Invoices started but not ready for review."
                    tone="neutral"
                  />
                  <WorkflowCard
                    title="Ready"
                    count={data.readyForReviewCount + data.validatedCount}
                    description="Invoices ready for tax and HS/PCT review."
                    tone="info"
                  />
                  <WorkflowCard
                    title="Pending"
                    count={data.submissionPendingCount + data.submittedCount}
                    description="Invoices waiting in mock submission workflow."
                    tone="warning"
                  />
                  <WorkflowCard
                    title="Accepted"
                    count={data.acceptedCount}
                    description="Invoices accepted by the mock FBR workflow."
                    tone="success"
                  />
                  <WorkflowCard
                    title="Rejected"
                    count={data.rejectedCount + data.failedCount}
                    description="Invoices requiring correction or resubmission."
                    tone="danger"
                  />
                </div>
              </div>

              <div className="card card-pad">
                <div className="section-head compact">
                  <div>
                    <span className="eyebrow">Compliance checks</span>
                    <h2>Demo readiness</h2>
                  </div>
                </div>

                <div className="checklist">
                  <div>
                    <span className="check ok">✓</span>
                    <p>ProBiz partner workspace configured</p>
                  </div>
                  <div>
                    <span className="check ok">✓</span>
                    <p>Client businesses managed internally</p>
                  </div>
                  <div>
                    <span className="check ok">✓</span>
                    <p>Mock FBR mode enabled</p>
                  </div>
                  <div>
                    <span className="check warn">!</span>
                    <p>HS/PCT and tax fields still require professional review</p>
                  </div>
                  <div>
                    <span className="check warn">!</span>
                    <p>Client portal should remain disabled until role checks are hardened</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-3 dashboard-sections">
              <div className="card card-pad">
                <div className="section-head compact">
                  <div>
                    <span className="eyebrow">Focus</span>
                    <h2>Next actions</h2>
                  </div>
                </div>

                <div className="focus-list">
                  {actionItems.map((item) => (
                    <div key={item.title} className="focus-item">
                      <strong>{compactNumber(item.value)}</strong>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card card-pad span-2">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Recent activity</span>
                    <h2>Latest invoices</h2>
                  </div>
                  <Link className="btn secondary small" href="/invoices">
                    View all
                  </Link>
                </div>

                {data.recentInvoices.length === 0 ? (
                  <div className="empty-state">
                    <h3>No invoices yet</h3>
                    <p>Create your first mock FBR-ready invoice for a client business.</p>
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
                          <th>Client business</th>
                          <th>Buyer</th>
                          <th>Status</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentInvoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td>
                              <Link className="table-link" href={`/invoices/${invoice.id}`}>
                                {invoice.invoiceNumber}
                              </Link>
                            </td>
                            <td>{invoice.business.name}</td>
                            <td>{invoice.buyerName}</td>
                            <td>
                              <StatusBadge status={invoice.status} />
                            </td>
                            <td className="amount-cell">{money(invoice.grandTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            <section className="note-panel">
              <strong>Compliance boundary:</strong>
              <span>
                This workspace is currently running in mock mode. It is designed for FBR digital
                invoicing workflows, but it should not be presented as an official FBR-certified or
                licensed-integrator connection until those credentials are obtained.
              </span>
            </section>
          </>
        )}
      </main>
    </>
  );
}
