import styles from "./EmptyShelf.module.css";

const GHOST_COUNT = 6;
// Opacity steps: 0.18 → 0.04 across 6 frames
const startOpacity = 0.55;
const endOpacity = 0.12;

function ghostOpacity(i: number): number {
  return startOpacity - (startOpacity - endOpacity) * (i / (GHOST_COUNT - 1));
}

interface EmptyShelfProps {
  line: string;
}

export default function EmptyShelf({ line }: EmptyShelfProps) {
  return (
    <div className={styles.shelf}>
      <div className={styles.ghosts} aria-hidden="true">
        {Array.from({ length: GHOST_COUNT }).map((_, i) => (
          <div
            key={i}
            className={styles.ghost}
            style={{ opacity: ghostOpacity(i) }}
          />
        ))}
      </div>
      <p className={styles.line}>{line}</p>
    </div>
  );
}
