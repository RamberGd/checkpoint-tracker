import { CropMarks } from 'checkpoint-frontend';

export const Default = () => (
  <div style={{
    position: 'relative',
    width: '100%',
    height: '340px',
    background: 'var(--bg)',
    overflow: 'hidden',
  }}>
    <CropMarks />
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
    }}>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--type-subhead)',
        color: 'var(--ink)',
        letterSpacing: '0.04em',
      }}>
        CHECKPOINT
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--type-caption)',
        color: 'var(--muted)',
        letterSpacing: '0.12em',
      }}>
        Issue 001 · MMXXVI
      </span>
    </div>
  </div>
);
