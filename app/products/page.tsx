'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppNav } from '@/components/AppNav';
import { HsCodePicker, type HsCodePickerValue } from '@/components/HsCodePicker';

type Business = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  defaultUnit: string;
  defaultTaxRate: string | number;
  defaultHsCodeId?: string | null;
  createdAt: string;
  business?: Business;
  defaultHsCode?: HsCodePickerValue | null;
};

type ProductsResponse = {
  products: Product[];
  businesses: Business[];
};

function compactNumber(value: string | number | null | undefined) {
  return Number(value || 0).toLocaleString('en-PK');
}

function formatDate(value?: string) {
  if (!value) return '-';

  return new Date(value).toLocaleDateString('en-PK', {
    dateStyle: 'medium'
  });
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessFilter, setBusinessFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [selectedHsCode, setSelectedHsCode] = useState<HsCodePickerValue | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    businessId: '',
    name: '',
    description: '',
    defaultUnit: 'PCS',
    defaultTaxRate: '18'
  });

  async function loadProducts() {
    setError('');

    try {
      const response = await fetch('/api/products');
      const data = (await response.json()) as ProductsResponse;

      if (!response.ok) {
        throw new Error((data as any).error || 'Failed to load products');
      }

      setProducts(data.products || []);
      setBusinesses(data.businesses || []);

      if (!form.businessId && data.businesses?.[0]?.id) {
        setForm((current) => ({
          ...current,
          businessId: data.businesses[0].id
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function createProduct(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!form.businessId) {
      setError('Please select a client business.');
      return;
    }

    if (!form.name.trim()) {
      setError('Product or service name is required.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          defaultTaxRate: Number(form.defaultTaxRate || 0),
          defaultHsCodeId: selectedHsCode?.id || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product/service');
      }

      setProducts((current) => [data.product, ...current]);
      setForm((current) => ({
        businessId: current.businessId,
        name: '',
        description: '',
        defaultUnit: 'PCS',
        defaultTaxRate: '18'
      }));
      setSelectedHsCode(null);
      setNotice('Product/service profile created successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product/service');
    } finally {
      setSaving(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesBusiness = businessFilter === 'ALL' || product.businessId === businessFilter;

      const haystack = [
        product.name,
        product.description || '',
        product.defaultUnit,
        String(product.defaultTaxRate),
        product.business?.name || '',
        product.defaultHsCode?.displayCode || '',
        product.defaultHsCode?.description || ''
      ]
        .join(' ')
        .toLowerCase();

      const matchesQuery = !loweredQuery || haystack.includes(loweredQuery);

      return matchesBusiness && matchesQuery;
    });
  }, [businessFilter, products, query]);

  const hsLinkedCount = filteredProducts.filter((product) => product.defaultHsCode).length;

  return (
    <>
      <AppNav />

      <main className="container">
        <section className="dashboard-hero">
          <div>
            <span className="eyebrow">Product and service master</span>
            <h1>Reusable invoice items</h1>
            <p>
              Store products and services with default unit, tax rate, and a manually reviewed
              HS/PCT code. You can now search the full HS/PCT list instead of relying only on
              automatic suggestions.
            </p>

            <div className="hero-actions">
              <Link className="btn" href="/invoices/new">
                Create invoice
              </Link>
              <Link className="btn secondary" href="/hs-codes">
                Full HS/PCT lookup
              </Link>
            </div>
          </div>

          <div className="workspace-card">
            <div className="workspace-topline">Product register</div>
            <h2>{compactNumber(filteredProducts.length)} items</h2>
            <div className="workspace-list">
              <div>
                <span>HS/PCT linked</span>
                <strong>{compactNumber(hsLinkedCount)}</strong>
              </div>
              <div>
                <span>Businesses</span>
                <strong>{compactNumber(businesses.length)}</strong>
              </div>
              <div>
                <span>Default tax review</span>
                <strong>Required</strong>
              </div>
            </div>
            <span className="mode-pill">Suggestion only</span>
          </div>
        </section>

        {error ? (
          <div className="alert danger">
            <strong>Product workspace issue</strong>
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div className="note-panel">
            <strong>Done:</strong>
            <span>{notice}</span>
          </div>
        ) : null}

        <section className="grid grid-3 dashboard-sections">
          <form className="card card-pad" onSubmit={createProduct}>
            <span className="eyebrow">Add product/service</span>
            <h2>New reusable item</h2>
            <p>
              Select a default HS/PCT code from the full lookup list. The selected code remains
              editable later on invoices.
            </p>

            <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
              <label>
                <span className="label">Client business</span>
                <select
                  className="select"
                  value={form.businessId}
                  onChange={(event) => updateForm('businessId', event.target.value)}
                  disabled={saving}
                  required
                >
                  <option value="">Select business</option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="label">Product/service name</span>
                <input
                  className="input"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="e.g. Cotton fabric"
                  disabled={saving}
                  required
                />
              </label>

              <label>
                <span className="label">Description</span>
                <textarea
                  className="textarea"
                  value={form.description}
                  onChange={(event) => updateForm('description', event.target.value)}
                  placeholder="Optional description for invoice line"
                  disabled={saving}
                />
              </label>

              <div className="grid grid-2">
                <label>
                  <span className="label">Default unit</span>
                  <input
                    className="input"
                    value={form.defaultUnit}
                    onChange={(event) => updateForm('defaultUnit', event.target.value)}
                    placeholder="PCS"
                    disabled={saving}
                  />
                </label>

                <label>
                  <span className="label">Default tax rate %</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.defaultTaxRate}
                    onChange={(event) => updateForm('defaultTaxRate', event.target.value)}
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="card card-pad" style={{ background: '#f8fafc' }}>
                <span className="label">Selected HS/PCT</span>
                {selectedHsCode ? (
                  <div>
                    <span className="badge info">{selectedHsCode.displayCode}</span>
                    <p style={{ margin: '10px 0 0' }}>{selectedHsCode.description}</p>
                    <button
                      className="btn ghost small"
                      type="button"
                      onClick={() => setSelectedHsCode(null)}
                      style={{ marginTop: 10 }}
                    >
                      Clear selection
                    </button>
                  </div>
                ) : (
                  <p style={{ marginBottom: 0 }}>No HS/PCT code selected.</p>
                )}
              </div>

              <button className="btn" type="submit" disabled={saving || businesses.length === 0}>
                {saving ? 'Creating...' : 'Create product/service'}
              </button>
            </div>
          </form>

          <div className="span-2">
            <HsCodePicker
              label="Default HS/PCT"
              helper="Search the full HS/PCT database and choose a default code for this product/service."
              value={selectedHsCode}
              initialQuery="cotton"
              onSelect={setSelectedHsCode}
            />
          </div>
        </section>

        <section className="card card-pad dashboard-sections">
          <div className="section-head">
            <div>
              <span className="eyebrow">Product list</span>
              <h2>Reusable item register</h2>
            </div>
            <span className="badge info">{compactNumber(products.length)} total</span>
          </div>

          <div className="grid grid-2" style={{ marginBottom: 18 }}>
            <label>
              <span className="label">Search product/service</span>
              <input
                className="input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, unit, HS/PCT, business"
              />
            </label>

            <label>
              <span className="label">Business</span>
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
                <p>Loading products/services...</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <h3>No products or services found</h3>
              <p>Create the first reusable item or adjust your filters.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product/service</th>
                    <th>Business</th>
                    <th>Defaults</th>
                    <th>HS/PCT</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                        <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                          {product.description || 'No description'}
                        </p>
                      </td>
                      <td>{product.business?.name || '-'}</td>
                      <td>
                        <p style={{ margin: 0 }}>Unit: {product.defaultUnit}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                          Tax: {Number(product.defaultTaxRate || 0).toLocaleString('en-PK')}%
                        </p>
                      </td>
                      <td>
                        {product.defaultHsCode ? (
                          <>
                            <span className="badge info">{product.defaultHsCode.displayCode}</span>
                            <p style={{ margin: '6px 0 0', fontSize: 12 }}>
                              {product.defaultHsCode.description}
                            </p>
                          </>
                        ) : (
                          <span className="badge neutral">Not selected</span>
                        )}
                      </td>
                      <td>{formatDate(product.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="note-panel">
          <strong>Important:</strong>
          <span>
            Default HS/PCT code and tax rate are convenience values only. They must remain editable
            and reviewed on each invoice before any real FBR workflow is enabled.
          </span>
        </section>
      </main>
    </>
  );
}
