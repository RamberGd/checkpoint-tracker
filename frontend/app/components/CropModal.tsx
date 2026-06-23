"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedBlob } from "../lib/cropImage";
import styles from "./CropModal.module.css";

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

interface CropModalProps {
  src: string;
  onApply: (blob: Blob) => void;
  onCancel: () => void;
}

export default function CropModal({ src, onApply, onCancel }: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);
  const [closing, setClosing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function dismiss() {
    setClosing(true);
  }

  // Only act on the overlay's own animation end, not events bubbling from the
  // panel child — otherwise onCancel fires twice during the closing sequence.
  function handleAnimationEnd(e: React.AnimationEvent<HTMLDivElement>) {
    if (closing && e.target === e.currentTarget) onCancel();
  }

  async function handleApply() {
    if (!croppedAreaPixels) return;
    setApplying(true);
    try {
      const blob = await getCroppedBlob(src, croppedAreaPixels);
      onApply(blob);
    } catch (err) {
      console.error("Crop failed", err);
      setApplying(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className={`${styles.overlay}${closing ? ` ${styles.closing}` : ""}`}
      onAnimationEnd={handleAnimationEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Crop profile picture"
    >
      <div className={styles.panel}>

        <div className={styles.cropArea}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={false}
          />
        </div>

        <div className={styles.zoomRow} aria-label="Zoom controls">
          <button
            type="button"
            className={styles.zoomBtn}
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
            disabled={zoom <= ZOOM_MIN}
          >
            −
          </button>
          <button
            type="button"
            className={styles.zoomBtn}
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
            disabled={zoom >= ZOOM_MAX}
          >
            +
          </button>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={dismiss}
            disabled={applying}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.cropBtn}
            onClick={handleApply}
            disabled={applying || !croppedAreaPixels}
          >
            {applying ? "Cropping…" : "Crop"}
          </button>
        </div>

      </div>
    </div>
  );
}
