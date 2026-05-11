import { AppNav } from '@/components/AppNav';

function SettingCard({
  label,
  value,
  helper,
  tone = 'info'
}: {
  label: string;
  value: string;
  helper: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
}) {
  return (
    <div className={`kpi-card ${tone}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ fontSize: 26 }}>
        {value}
      </div>
      <div className="kpi-helper">{helper}</div>
    </div>
  );
}

export default function SettingsPage() {
  const fbrMode = process.env.FBR_MODE || 'mock';
  const aiProvider = process.env.AI_PROVIDER || 'mock';
  const appUrl = process.env.APP_URL || 'Not configured';

  return (
    <>
      <AppNav />

      <main className="container">
        <section className="dashboard-hero">
          <div>
            <span className="eyebrow">Settings</span>
            <h1>Workspace configuration</h1>
            <p>
              Review the current ProBiz E-Invoicing environment, compliance boundary, and beta
              operating mode. Keep sensitive credentials out of screenshots and frontend variables.
            </p>
          </div>

          <div className="workspace-card">
            <div className="workspace-topline">Operating mode</div>
            <h2>Controlled beta</h2>
            <div className="workspace-list">
              <div>
                <span>FBR mode</span>
                <strong>{fbrMode}</strong>
              </div>
              <div>
                <span>AI provider</span>
                <strong>{aiProvider}</strong>
              </div>
              <div>
                <span>Client portal</span>
                <strong>Disabled</strong>
              </div>
            </div>
            <span className="mode-pill">Mock mode active</span>
          </div>
        </section>

        <section className="grid grid-3">
          <SettingCard
            label="FBR mode"
            value={fbrMode}
            helper="Keep this as mock until official credentials or licensed-integrator access is ready."
            tone="warning"
          />
          <SettingCard
            label="AI provider"
            value={aiProvider}
            helper="Mock AI keeps demos safe while invoice drafting and tax-field suggestions are tested."
            tone="info"
          />
          <SettingCard
            label="App URL"
            value={appUrl}
            helper="This should match the active Vercel deployment URL for production testing."
            tone="success"
          />
        </section>

        <section className="grid grid-2 dashboard-sections">
          <div className="card card-pad">
            <span className="eyebrow">Access model</span>
            <h2>ProBiz-only workspace</h2>
            <div className="checklist" style={{ marginTop: 16 }}>
              <div>
                <span className="check ok">✓</span>
                <p>Only seeded ProBiz partner accounts should log in for beta testing.</p>
              </div>
              <div>
                <span className="check ok">✓</span>
                <p>Client businesses are managed internally by ProBiz partners.</p>
              </div>
              <div>
                <span className="check warn">!</span>
                <p>
                  Client login should stay disabled until a restricted client portal is implemented
                  and tested.
                </p>
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <span className="eyebrow">Security checklist</span>
            <h2>Before real data</h2>
            <div className="checklist" style={{ marginTop: 16 }}>
              <div>
                <span className="check warn">!</span>
                <p>Rotate any Neon URL, JWT secret, FBR token, or API key exposed in screenshots.</p>
              </div>
              <div>
                <span className="check warn">!</span>
                <p>Use dummy invoices only until tenant isolation and audit logging are verified.</p>
              </div>
              <div>
                <span className="check warn">!</span>
                <p>Do not put secrets in public frontend variables or committed source files.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="card card-pad dashboard-sections">
          <div className="section-head">
            <div>
              <span className="eyebrow">Compliance boundary</span>
              <h2>What the product can and cannot claim</h2>
            </div>
            <span className="badge warn">Important</span>
          </div>

          <div className="grid grid-2">
            <div className="card card-pad" style={{ background: '#f8fafc' }}>
              <h3>Allowed wording for now</h3>
              <div className="checklist" style={{ marginTop: 12 }}>
                <div>
                  <span className="check ok">✓</span>
                  <p>FBR-ready workflow</p>
                </div>
                <div>
                  <span className="check ok">✓</span>
                  <p>Designed for Pakistani digital invoicing workflows</p>
                </div>
                <div>
                  <span className="check ok">✓</span>
                  <p>Mock FBR submission testing</p>
                </div>
              </div>
            </div>

            <div className="card card-pad" style={{ background: '#f8fafc' }}>
              <h3>Avoid until proof exists</h3>
              <div className="checklist" style={{ marginTop: 12 }}>
                <div>
                  <span className="check warn">!</span>
                  <p>Official FBR certified</p>
                </div>
                <div>
                  <span className="check warn">!</span>
                  <p>Licensed FBR integrator</p>
                </div>
                <div>
                  <span className="check warn">!</span>
                  <p>Direct live FBR connected</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="note-panel">
          <strong>Production note:</strong>
          <span>
            Keep FBR and AI providers in mock mode until official credentials, compliance review,
            live submission storage, retry handling, and user-confirmation controls are implemented.
          </span>
        </section>
      </main>
    </>
  );
}
