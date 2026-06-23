import styles from "./page.module.css";
import Reveal from "./components/Reveal";
import CropMarks from "./components/CropMarks";
import HeroScroll from "./components/HeroScroll";
import StillParallax from "./components/StillParallax";
import Navbar from "./components/Navbar";

const ARCHIVE_ITEMS = [
  {
    action: "Track",
    desc: "Log every game: the completed, the abandoned at chapter three, the ones you paused for a year and quietly returned to.",
  },
  {
    action: "Wishlist",
    desc: "The queue. Everything you've been meaning to start, held somewhere you'll actually find it.",
  },
  {
    action: "Review",
    desc: "Write it down before the feeling fades. A sentence. A paragraph. Your words, not the algorithm's summary.",
  },
  {
    action: "Discover",
    desc: "Games that match your taste, not the trending tab. Surfaced from what you've already played.",
  },
];

export default function Home() {
  return (
    <>
      <CropMarks />
      <Navbar variant="landing" />

      <main>
        {/* ── SPREADS 1 + 2: Horizontal scroll intro ── */}
        <HeroScroll />

        {/* ── SPREAD 3: Archive ── */}
        <section className={styles.archive} aria-label="What CheckPoint does">
          <div className={styles.archiveCols} role="list">
            {ARCHIVE_ITEMS.map((item, i) => (
              <Reveal key={item.action} delay={i * 100}>
                <article className={styles.archiveCol} role="listitem">
                  <p className={styles.archiveSlug}>{item.action}</p>
                  <p className={styles.archiveDesc}>{item.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── SPREAD 4: Pull Quote Interlude ── */}
        <section className={styles.interlude} aria-label="Editorial interlude">
          <Reveal>
            <div className={styles.interludeInner}>
              <div className={styles.interludeRulePair} aria-hidden="true" />
              <blockquote className={styles.interludeQuote}>
                Some games you carry.
              </blockquote>
              <div className={styles.interludeRulePair} aria-hidden="true" />
            </div>
          </Reveal>
        </section>

        {/* ── SPREAD 5: Film Still ── */}
        <StillParallax />

        {/* ── SPREAD 6: Closing ── */}
        <footer className={styles.closing} aria-label="Get early access">
          <div className={styles.closingInner}>
            <Reveal>
              <div className={styles.closingAccentRule} aria-hidden="true" />
            </Reveal>
            <Reveal delay={120}>
              <p className={styles.closingTitle}>
                Join the first issue. Track what you play.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <a href="/signup" className={styles.ctaButton} aria-label="Sign up for early access">
                Sign Up
              </a>
            </Reveal>

            <Reveal delay={400}>
              <div className={styles.closingFoot}>
                <span>CheckPoint © MMXXVI</span>
                <span>A game journal</span>
              </div>
            </Reveal>
          </div>
        </footer>
      </main>
    </>
  );
}
