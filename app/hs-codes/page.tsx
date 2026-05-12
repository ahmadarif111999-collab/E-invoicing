'use client';

import { useState } from 'react';
import { AppNav } from '@/components/AppNav';
import { HsCodePicker, type HsCodePickerValue } from '@/components/HsCodePicker';

export default function HsCodesPage() {
  const [selectedCode, setSelectedCode] = useState<HsCodePickerValue | null>(null);

  return (
    <>
      <AppNav />

      <main className="container">
        <section className="dashboard-hero">
          <div>
            <span className="eyebrow">HS/PCT lookup</span>
            <h1>Full HS/PCT search and selection</h1>
            <p>
              Search by exact PCT code, partial code, chapter, or product description. This page is
              for lookup and review only; it does not decide tax treatment automatically.
            </p>
          </div>

          <div className="workspace-card">
            <div className="workspace-topline">Current selection</div>
            <h2>{selectedCode ? selectedCode.displayCode : 'No code selected'}</h2>
            <p>
              {selectedCode
                ? selectedCode.description
                : 'Search or browse the full HS/PCT list, then select a row to inspect it.'}
            </p>
            <span className="mode-pill">Suggestion only</span>
          </div>
        </section>

        <HsCodePicker
          label="HS/PCT code lookup"
          helper="Use this full search when automatic suggestions are incomplete or not accurate."
          value={selectedCode}
          initialQuery="cotton"
          onSelect={setSelectedCode}
        />

        {selectedCode ? (
          <section className="grid grid-3 dashboard-sections">
            <div className="card card-pad">
              <span className="eyebrow">Selected PCT</span>
              <h2>{selectedCode.displayCode}</h2>
              <p>{selectedCode.description}</p>
            </div>

            <div className="card card-pad">
              <span className="eyebrow">Chapter</span>
              <h2>{selectedCode.chapter || selectedCode.code.slice(0, 2)}</h2>
              <p>Use chapter as a starting point for review, not final legal classification.</p>
            </div>

            <div className="card card-pad">
              <span className="eyebrow">CD%</span>
              <h2>{selectedCode.customsDuty || '-'}</h2>
              <p>Customs duty reference only. Do not auto-apply this as sales tax.</p>
            </div>
          </section>
        ) : null}

        <section className="note-panel">
          <strong>Compliance boundary:</strong>
          <span>
            HS/PCT rows are lookup data. Final classification, sales tax rate, SRO treatment,
            exemption status, UOM, and FBR scenario mapping must remain configurable and reviewed.
          </span>
        </section>
      </main>
    </>
  );
}
