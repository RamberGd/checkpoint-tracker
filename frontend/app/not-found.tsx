import Link from "next/link";
import Reveal from "./components/Reveal";
import Navbar from "./components/Navbar";
import styles from "./not-found.module.css";

const GHOST_REVIEWS = [
  {
    meta: "ANONYMOUS · ██ ███ ████",
    lines: [
      "█████ ███ █████████ ██ ████ ██████ ███ ████ █████",
      "██████ ████ ███ ██ █████ ███ ████████",
    ],
  },
  {
    meta: "ANONYMOUS · ██ ███ ████",
    lines: [
      "████ ██████ █████ ███ ███████ ██████ ████",
      "███ ████ ██████ ██ █████ ████ ██ ████████ ███",
      "████ ███ ████",
    ],
  },
  {
    meta: "ANONYMOUS · ██ ███ ████",
    lines: [
      "██████ ███ █████ ████ ██████ ██ ███",
      "████████ ████ ██ █████ ████",
    ],
  },
];

export default function NotFound() {
  return (
    <div className={styles.page}>
      <Navbar />

      <main>
        {/* ── Hero ── */}
        <section className={styles.hero} aria-label="Page not found">

          {/* Cover slot — static, no Reveal */}
          <div className={styles.coverSlot}>
            <div className={styles.coverBox} aria-hidden="true" />
            <p className={styles.coverLabel}>COVER · NOT ON FILE</p>
          </div>

          {/* Meta column — animates in */}
          <Reveal delay={120} className={styles.meta}>
            <p className={styles.errorCode}>404</p>
            <h1 className={styles.title}>NO RECORD FOUND</h1>
            <div className={styles.divider} aria-hidden="true" />
            <p className={styles.subtext}>
              This title does not exist in the CheckPoint database.
            </p>
            <div
              className={styles.ratingDots}
              aria-label="No rating"
              aria-hidden="true"
            >
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={styles.dot} />
              ))}
            </div>
            <Link href="/profile" className={styles.cta}>
              — BACK
            </Link>
          </Reveal>

        </section>

        {/* ── Ghost reviews ── */}
        <section className={styles.reviewsSection} aria-label="Reviews">
          <div className={styles.reviewsInner}>

            <div className={styles.reviewsHeader}>
              <h2 className={styles.reviewsTitle}>Reviews</h2>
              <span className={styles.reviewsCount} aria-hidden="true">0</span>
            </div>

            <div className={styles.reviewsList} role="list">
              {GHOST_REVIEWS.map((review, i) => (
                <div key={i} className={styles.reviewItem} role="listitem" aria-hidden="true">
                  <div className={styles.reviewLeft}>
                    <span className={styles.ghostMeta}>{review.meta}</span>
                  </div>
                  <div className={styles.reviewRight}>
                    {review.lines.map((line, j) => (
                      <p key={j} className={styles.ghostLine}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
