import styles from "../page.module.css";

export default function CropMarks() {
  return (
    <div className={styles.cropMarks} aria-hidden="true">
      <span className={`${styles.cropMark} ${styles.cropBL}`} />
      <span className={`${styles.cropMark} ${styles.cropBR}`} />
    </div>
  );
}
