'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppNav } from '@/components/AppNav';

type Business = {
  id: string;
  name: string;
};

type Customer = {
  id: string;
  businessId: string;
  name: string;
  ntn?: string | null;
  strn?: string | null;
  cnic?: string | null;
  address?: string | null;
  createdAt: string;
  business?: Business;
  _count?: {
    invoices: number;
  };
};

type CustomersResponse = {
  customers: Customer[];
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessFilter, setBusinessFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    businessId: '',
    name: '',
    ntn: '',
    strn: '',
    cnic: '',
    address: ''
  });

  async function loadCustomers() {
    setError('');

    try {
      const response = await fetch('/api/customers');
      const data = (await response.json()) as CustomersResponse;

      if (!response.ok) {
        throw new Error((data as any).error || 'Failed to load customers');
      }

      setCustomers(data.customers || []);
      setBusinesses(data.businesses || []);

      if (!form.businessId && data.businesses?.[0]?.id) {
        setForm((current) => ({
          ...current,
          businessId: data.businesses[0].id
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function createCustomer(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!form.businessId) {
      setError('Please select a client business.');
      return;
    }

    if (!form.name.trim()) {
      setError('Customer name is required.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create customer');
      }

      setCustomers((current) => [data.customer, ...current]);
      setForm((current) => ({
        businessId: current.businessId,
        name: '',
        ntn: '',
        strn: '',
        cnic: '',
        address: ''
      }));
      setNotice('Customer profile created successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  }

  const filteredCustomers = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesBusiness =
        businessFilter === 'ALL' || customer.businessId === businessFilter;

      const haystack = [
        customer.name,
        customer.ntn || '',
        customer.strn || '',
        customer.cnic || '',
        customer.address || '',
        customer.business?.name || ''
      ]
        .join(' ')
        .toLowerCase();

      const matchesQuery = !loweredQuery || haystack.includes(loweredQuery);

      return matchesBusiness && matchesQuery;
    });
  }, [businessFilter, customers, query]);

  const totalInvoices = filteredCustomers.reduce(
    (sum, customer) => sum + Number(customer._count?.invoices || 0),
    0
  );

  const registeredCustomers = filteredCustomers.filter(
    (customer) => customer.ntn || customer.strn
  ).length;

  return (
    <>
      <AppNav />

      <main className="container">
        <section className="dashboard-hero">
          <div>
            <span className="eyebrow">Buyer master</span>
            <h1>Customer profiles</h1>
            <p>
              Store buyer names, registration numbers, CNIC, and address details for ProBiz client
              businesses. These profiles will be used in the next batch to speed up invoice
              creation.
            </p>

            <div className="hero-actions">
              <Link className="btn" href="/invoices/new">
                Create invoice
              </Link>
              <Link className="btn secondary" href="/businesses">
                Manage businesses
              </Link>
            </div>
          </div>

          <div className="workspace-card">
            <div className="workspace-topline">Customer register</div>
            <h2>{compactNumber(filteredCustomers.length)} customers</h2>
            <div className="workspace-list">
              <div>
                <span>Registered buyers</span>
                <strong>{compactNumber(registeredCustomers)}</strong>
              </div>
              <div>
                <span>Linked invoices</span>
                <strong>{compactNumber(totalInvoices)}</strong>
              </div>
              <div>
                <span>Businesses</span>
                <strong>{compactNumber(businesses.length)}</strong>
              </div>
            </div>
            <span className="mode-pill">Client portal disabled</span>
          </div>
        </section>

        {error ? (
          <div className="alert danger">
            <strong>Customer workspace issue</strong>
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
          <form className="card card-pad" onSubmit={createCustomer}>
            <span className="eyebrow">Add customer</span>
            <h2>New buyer profile</h2>
            <p>
              Add a buyer/customer under one client business. This does not create a client login.
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
                <span className="label">Customer / buyer name</span>
                <input
                  className="input"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="e.g. Retail House Lahore"
                  disabled={saving}
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
                    disabled={saving}
                  />
                </label>

                <label>
                  <span className="label">STRN</span>
                  <input
                    className="input"
                    value={form.strn}
                    onChange={(event) => updateForm('strn', event.target.value)}
                    placeholder="Optional"
                    disabled={saving}
                  />
                </label>
              </div>

              <label>
                <span className="label">CNIC</span>
                <input
                  className="input"
                  value={form.cnic}
                  onChange={(event) => updateForm('cnic', event.target.value)}
                  placeholder="Optional"
                  disabled={saving}
                />
              </label>

              <label>
                <span className="label">Address</span>
                <textarea
                  className="textarea"
                  value={form.address}
                  onChange={(event) => updateForm('address', event.target.value)}
                  placeholder="City, province, Pakistan"
                  disabled={saving}
                />
              </label>

              <button className="btn" type="submit" disabled={saving || businesses.length === 0}>
                {saving ? 'Creating...' : 'Create customer'}
              </button>
            </div>
          </form>

          <div className="card card-pad span-2">
            <div className="section-head">
              <div>
                <span className="eyebrow">Customer list</span>
                <h2>Buyer register</h2>
              </div>
              <span className="badge info">{compactNumber(customers.length)} total</span>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 18 }}>
              <label>
                <span className="label">Search customer</span>
                <input
                  className="input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, NTN, STRN, CNIC, address"
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
                  <p>Loading customers...</p>
                </div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="empty-state">
                <h3>No customers found</h3>
                <p>Create the first customer profile or adjust your search filters.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Business</th>
                      <th>Registration</th>
                      <th>Invoices</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td>
                          <strong>{customer.name}</strong>
                          <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                            {customer.address || 'Address not recorded'}
                          </p>
                        </td>
                        <td>{customer.business?.name || '-'}</td>
                        <td>
                          <p style={{ margin: 0 }}>NTN: {customer.ntn || '-'}</p>
                          <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                            STRN: {customer.strn || '-'} | CNIC: {customer.cnic || '-'}
                          </p>
                        </td>
                        <td>{compactNumber(customer._count?.invoices || 0)}</td>
                        <td>{formatDate(customer.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="note-panel">
          <strong>Access boundary:</strong>
          <span>
            Customer profiles belong to ProBiz-managed client businesses. They do not create
            external client accounts or client portal access.
          </span>
        </section>
      </main>
    </>
  );
}
