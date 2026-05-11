'use client';

import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';

export default function ReportsPage() {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/reports').then((response) => response.json()).then(setData);
  }, []);

  return (
    <main className="container">
      <h1>Reports</h1>
      <p className="muted">Sales, tax, pending, accepted, and rejected invoice summaries.</p>
      <AppNav />
      {!data ? <p className="muted">Loading...</p> : (
        <>
          <div className="grid grid-3">
            <div className="kpi"><h3>{Number(data.salesTotal).toLocaleString()}</h3><p>Sales total</p></div>
            <div className="kpi"><h3>{Number(data.taxTotal).toLocaleString()}</h3><p>Tax total</p></div>
            <div className="kpi"><h3>{data.pending}</h3><p>Pending invoices</p></div>
          </div>
          <section className="card card-pad" style={{ marginTop: 18 }}>
            <table>
              <thead><tr><th>Invoice</th><th>Buyer</th><th>Status</th><th>Tax</th><th>Total</th></tr></thead>
              <tbody>
                {data.invoices.map((invoice: any) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{invoice.buyerName}</td>
                    <td>{invoice.status}</td>
                    <td>{Number(invoice.taxTotal).toLocaleString()}</td>
                    <td>{Number(invoice.grandTotal).toLocaleString()}</td>
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
