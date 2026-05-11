'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppNav } from '@/components/AppNav';

type Line = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  taxRate: number;
  hsCodeId?: string | null;
  hsLabel?: string;
  suggestions?: any[];
};

function newLine(): Line {
  return { description: '', quantity: 1, unit: 'PCS', unitPrice: 0, discount: 0, taxRate: 18, hsCodeId: null, hsLabel: '', suggestions: [] };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [businessId, setBusinessId] = useState('');
  const [buyerName, setBuyerName] = useState('Retail House Lahore');
  const [buyerNtn, setBuyerNtn] = useState('7654321-0');
  const [buyerStrn, setBuyerStrn] = useState('3277876543210');
  const [buyerAddress, setBuyerAddress] = useState('Lahore, Pakistan');
  const [items, setItems] = useState<Line[]>([{ ...newLine(), description: 'cotton fabric', unit: 'MTR', unitPrice: 1000 }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/businesses')
      .then((response) => response.json())
      .then((data) => {
        setBusinesses(data.businesses || []);
        setBusinessId(data.businesses?.[0]?.id || '');
      });
  }, []);

  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      const base = Number(item.quantity || 0) * Number(item.unitPrice || 0);
      const taxable = Math.max(0, base - Number(item.discount || 0));
      const tax = taxable * (Number(item.taxRate || 0) / 100);
      acc.subtotal += base;
      acc.discount += Number(item.discount || 0);
      acc.tax += tax;
      acc.total += taxable + tax;
      return acc;
    }, { subtotal: 0, discount: 0, tax: 0, total: 0 });
  }, [items]);

  function updateLine(index: number, patch: Partial<Line>) {
    setItems((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  async function suggest(index: number) {
    const line = items[index];
    if (!line.description.trim()) return;
    const response = await fetch('/api/hs-codes/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: line.description, limit: 4 })
    });
    const data = await response.json();
    updateLine(index, { suggestions: data.suggestions || [] });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, buyerName, buyerNtn, buyerStrn, buyerAddress, items })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create invoice');
      router.push(`/invoices/${data.invoice.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container">
      <h1>Create invoice</h1>
      <p className="muted">HS/PCT code suggestions appear from item descriptions. You can override them before saving.</p>
      <AppNav />
      <form onSubmit={save} className="grid" style={{ gap: 18 }}>
        <section className="card card-pad grid grid-2">
          <div>
            <label className="label">Business</label>
            <select className="select" value={businessId} onChange={(event) => setBusinessId(event.target.value)}>
              {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Buyer name</label>
            <input className="input" value={buyerName} onChange={(event) => setBuyerName(event.target.value)} />
          </div>
          <div>
            <label className="label">Buyer NTN</label>
            <input className="input" value={buyerNtn} onChange={(event) => setBuyerNtn(event.target.value)} />
          </div>
          <div>
            <label className="label">Buyer STRN</label>
            <input className="input" value={buyerStrn} onChange={(event) => setBuyerStrn(event.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label">Buyer address</label>
            <input className="input" value={buyerAddress} onChange={(event) => setBuyerAddress(event.target.value)} />
          </div>
        </section>

        <section className="card card-pad">
          <div className="between"><h2>Invoice lines</h2><button className="btn secondary" type="button" onClick={() => setItems([...items, newLine()])}>Add line</button></div>
          <div className="grid">
            {items.map((line, index) => (
              <div key={index} className="card card-pad" style={{ boxShadow: 'none' }}>
                <div className="grid grid-3">
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Description</label>
                    <input className="input" value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} onBlur={() => suggest(index)} placeholder="e.g. cotton fabric" />
                  </div>
                  <div><label className="label">Qty</label><input className="input" type="number" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} /></div>
                  <div><label className="label">Unit</label><input className="input" value={line.unit} onChange={(event) => updateLine(index, { unit: event.target.value })} /></div>
                  <div><label className="label">Unit price</label><input className="input" type="number" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: Number(event.target.value) })} /></div>
                  <div><label className="label">Discount</label><input className="input" type="number" value={line.discount} onChange={(event) => updateLine(index, { discount: Number(event.target.value) })} /></div>
                  <div><label className="label">Tax rate %</label><input className="input" type="number" value={line.taxRate} onChange={(event) => updateLine(index, { taxRate: Number(event.target.value) })} /></div>
                  <div><label className="label">Selected HS/PCT</label><input className="input" value={line.hsLabel || ''} readOnly placeholder="Auto suggested" /></div>
                </div>
                <div className="row" style={{ marginTop: 12 }}>
                  <button type="button" className="btn secondary" onClick={() => suggest(index)}>Suggest HS code</button>
                  <button type="button" className="btn danger" onClick={() => setItems(items.filter((_, i) => i !== index))}>Remove</button>
                </div>
                {line.suggestions?.length ? (
                  <div className="grid" style={{ marginTop: 12 }}>
                    {line.suggestions.map((suggestion) => (
                      <button type="button" key={suggestion.id} className="card card-pad" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => updateLine(index, { hsCodeId: suggestion.id, hsLabel: `${suggestion.displayCode} - ${suggestion.description}` })}>
                        <strong>{suggestion.displayCode}</strong> <span className="badge ok">{suggestion.confidence}% match</span>
                        <p className="muted" style={{ margin: '6px 0 0' }}>{suggestion.description}</p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="card card-pad between">
          <div>
            <p>Subtotal: <strong>{totals.subtotal.toLocaleString()}</strong></p>
            <p>Discount: <strong>{totals.discount.toLocaleString()}</strong></p>
            <p>Tax: <strong>{totals.tax.toLocaleString()}</strong></p>
            <h2>Total: {totals.total.toLocaleString()}</h2>
          </div>
          <div>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn" disabled={saving || !businessId}>{saving ? 'Saving...' : 'Save invoice'}</button>
          </div>
        </section>
      </form>
    </main>
  );
}
