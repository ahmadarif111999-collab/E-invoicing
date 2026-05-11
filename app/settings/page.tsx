import { AppNav } from '@/components/AppNav';

export default function SettingsPage() {
  return (
    <main className="container">
      <h1>Settings</h1>
      <p className="muted">This starter keeps FBR and AI providers in mock mode until official credentials or licensed-integrator access are configured.</p>
      <AppNav />
      <section className="card card-pad grid">
        <div><strong>FBR mode:</strong> {process.env.FBR_MODE || 'mock'}</div>
        <div><strong>AI provider:</strong> {process.env.AI_PROVIDER || 'mock'}</div>
        <div><strong>Production boundary:</strong> Do not claim FBR certification or official integrator status until proof exists.</div>
      </section>
    </main>
  );
}
