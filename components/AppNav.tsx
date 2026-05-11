'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/businesses', label: 'Businesses' },
  { href: '/customers', label: 'Customers' },
  { href: '/products', label: 'Products' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/invoices/new', label: 'New invoice' },
  { href: '/hs-codes', label: 'HS/PCT codes' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' }
];

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  if (href === '/invoices') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  async function logout() {
    await fetch('/api/auth/logout', {
      method: 'POST'
    });

    window.location.href = '/login';
  }

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">P</span>
          <span>
            <strong>ProBiz E-Invoicing</strong>
            <small>Firm workspace</small>
          </span>
        </Link>

        <nav className="app-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActivePath(pathname, item.href) ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <span className="mode-pill small">Mock FBR</span>
          <button className="btn ghost small" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
