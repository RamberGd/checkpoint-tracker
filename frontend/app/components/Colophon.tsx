import styles from "./Colophon.module.css";

/**
 * Diegetic print colophon: a faux publication stamp — barcode, ISSN, issue
 * number/year, and the journal's subject tags. The barcode and registration
 * codes frame the whole strip as a printed artifact, so the subject words
 * (Games / Culture / Memory) read as classification on a stamp, not as
 * clickable nav links. Purely decorative, hence aria-hidden.
 */
export default function Colophon() {
  return (
    <span className={styles.colophon} aria-hidden="true">
      <span className={styles.barcode} />
      <span className={styles.code}>ISSN 2026-001X</span>
      <span className={styles.sep}>·</span>
      <span className={styles.code}>Nº 001 · MMXXVI</span>
      <span className={styles.sep}>·</span>
      <span className={styles.subjects}>Games / Culture / Memory</span>
    </span>
  );
}
