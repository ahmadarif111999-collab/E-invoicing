'use client';

import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/invoices')
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Failed to load invoices');
        setInvoices(body.invoices || []);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="container">
      <div className="between">
        <div><h1>Invoices</h1><p className="muted">Create, review, and submit invoices in mock FBR mode.</p></div>
        <a className="btn" href="/invoices/new">Create invoice</a>
      </div>
      <AppNav />
      {error ? <p className="error">{error}</p> : null}
      <section className="card card-pad">
        <table>
          <thead><tr><th>Invoice</th><th>Buyer</th><th>Status</th><th>Total</th><th>FBR Ref</th></tr></thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td><a href={`/invoices/${invoice.id}`}><strong>{invoice.invoiceNumber}</strong></a></td>
                <td>{invoice.buyerName}</td>
                <td><span className="badge">{invoice.status}</span></td>
                <td>{Number(invoice.grandTotal).toLocaleString()}</td>
                <td>{invoice.fbrInvoiceNumber || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
