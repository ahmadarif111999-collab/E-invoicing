export function AppNav() {
  return (
    <nav className="nav">
      <a href="/dashboard">Dashboard</a>
      <a href="/invoices">Invoices</a>
      <a href="/invoices/new">Create invoice</a>
      <a href="/hs-codes">HS/PCT codes</a>
      <a href="/reports">Reports</a>
      <a href="/settings">Settings</a>
    </nav>
  );
}
