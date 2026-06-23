import { Reveal } from 'checkpoint-frontend';

const wrap = {
  padding: '3rem 4rem',
  background: 'var(--bg)',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '2.5rem',
};

const card = {
  borderTop: '1px solid var(--rule)',
  paddingTop: '1.5rem',
};

const label = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--type-caption)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.12em',
  color: 'var(--muted)',
  marginBottom: '0.5rem',
};

const headline = {
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--type-subhead)',
  color: 'var(--ink)',
  lineHeight: 1.1,
};

export const TextReveal = () => (
  <div style={wrap}>
    <Reveal>
      <div style={card}>
        <p style={label}>Section heading</p>
        <h2 style={headline}>The games that stayed with you.</h2>
      </div>
    </Reveal>
    <Reveal delay={120}>
      <div style={card}>
        <p style={label}>Body copy</p>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)', lineHeight: 1.65 }}>
          A journal for every game you've touched — played, abandoned, returned to.
        </p>
      </div>
    </Reveal>
  </div>
);

export const ImageReveal = () => (
  <div style={wrap}>
    <Reveal variant="image">
      <div style={{
        width: '100%',
        aspectRatio: '16/9',
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }} />
    </Reveal>
  </div>
);

export const Staggered = () => (
  <div style={wrap}>
    {['TRACK', 'WISHLIST', 'REVIEW', 'DISCOVER'].map((label, i) => (
      <Reveal key={label} delay={i * 80}>
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--type-subhead)', color: 'var(--ink)' }}>{label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-caption)', color: 'var(--muted)' }}>0{i + 1}</span>
        </div>
      </Reveal>
    ))}
  </div>
);
