import { CropModal } from 'checkpoint-frontend';

const PLACEHOLDER_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='480'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%231a0d2e'/%3E%3Cstop offset='50%25' stop-color='%23290a1e'/%3E%3Cstop offset='100%25' stop-color='%230d0d12'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='480' height='480' fill='url(%23g)'/%3E%3Ccircle cx='240' cy='240' r='80' fill='%23c4862244' stroke='%23c48622' stroke-width='1'/%3E%3Ctext x='240' y='248' text-anchor='middle' font-family='serif' font-size='14' fill='%23c48622' letter-spacing='4' opacity='0.7'%3EAVATAR%3C/text%3E%3C/svg%3E";

export const Open = () => (
  <div style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg)' }}>
    <CropModal
      src={PLACEHOLDER_SRC}
      onApply={() => {}}
      onCancel={() => {}}
    />
  </div>
);
