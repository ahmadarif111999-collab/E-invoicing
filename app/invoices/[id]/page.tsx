'use client';

import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<any | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const response = await fetch(`/api/invoices/${params.id}`);
    const data = await response.json();
    if (response.ok) setInvoice(data.invoice);
    else setError(data.error || 'Failed to load invoice');
  }

  useEffect(() => { load(); }, []);

  async function submitMock() {
    setSubmitting(true);
    setMessage('');
    setError('');
    const response = await fetch(`/api/invoices/${params.id}/submit`, { method: 'POST' });
    const data = await response.json();
    if (response.ok) {
      setMessage(data.accepted ? 'Mock FBR submission accepted.' : `Mock FBR rejected: ${data.validationErrors?.join(', ')}`);
      await load();
    } else {
      setError(data.error || 'Submission failed');
    }
    setSubmitting(false);
  }

  return (
    <main className="container">
      <div className="between">
        <div><h1>Invoice detail</h1><p className="muted">Review invoice lines and mock FBR submission history.</p></div>
        <a className="btn secondary" href="/invoices">Back to invoices</a>
      </div>
      <AppNav />
      {error ? <p className="error">{error}</p> : null}
      {!invoice ? <p className="muted">Loading...</p> : (
        <>
          <section className="card card-pad between">
            <div>
              <h2>{invoice.invoiceNumber}</h2>
              <p><strong>Buyer:</strong> {invoice.buyerName}</p>
              <p><strong>Status:</strong> <span className="badge">{invoice.status}</span></p>
              <p><strong>FBR reference:</strong> {invoice.fbrInvoiceNumber || '-'}</p>
            </div>
            <button className="btn" onClick={submitMock} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit to mock FBR'}</button>
          </section>

          {message ? <p className="success">{message}</p> : null}

          <section className="card card-pad" style={{ marginTop: 18 }}>
            <h2>Lines</h2>
            <table>
              <thead><tr><th>Description</th><th>HS/PCT</th><th>Qty</th><th>Unit Price</th><th>Tax</th><th>Total</th></tr></thead>
              <tbody>
                {invoice.items.map((item: any) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.hsCode ? `${item.hsCode.displayCode} - ${item.hsCode.description}` : <span className="error">Missing</span>}</td>
                    <td>{Number(item.quantity).toLocaleString()} {item.unit}</td>
                    <td>{Number(item.unitPrice).toLocaleString()}</td>
                    <td>{Number(item.taxAmount).toLocaleString()}</td>
                    <td>{Number(item.lineTotal).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h2 style={{ textAlign: 'right' }}>Grand total: {Number(invoice.grandTotal).toLocaleString()}</h2>
          </section>

          <section className="card card-pad" style={{ marginTop: 18 }}>
            <h2>Submission history</h2>
            <table>
              <thead><tr><th>Status</th><th>Reference</th><th>Created</th></tr></thead>
              <tbody>
                {invoice.submissions.map((submission: any) => (
                  <tr key={submission.id}>
                    <td>{submission.status}</td>
                    <td>{submission.referenceNumber || '-'}</td>
                    <td>{new Date(submission.createdAt).toLocaleString()}</td>
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
