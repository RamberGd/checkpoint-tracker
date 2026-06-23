"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/auth";
import { api, ApiError } from "../lib/api";
import styles from "./edit-profile.module.css";
import RequireAuth from "../components/RequireAuth";
import CropModal from "../components/CropModal";

const DEFAULT_AVATAR = "/static/images/fallback_avatar.svg";

type Phase = "idle" | "loading" | "saved";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();

  const [username, setUsername] = useState("");
  const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);
  // The actual File chosen for upload (avatarSrc is only the preview URL).
  const pendingFileRef = useRef<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Tracks the last-saved username so isDirty stays accurate after saves.
  const savedUsernameRef = useRef("");

  // Prefill from the authenticated user once the session has bootstrapped.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    setUsername(user.username);
    savedUsernameRef.current = user.username;
    setAvatarSrc(user.avatarUrl ?? DEFAULT_AVATAR);
  }, [user, loading, router]);

  const isDirty =
    username.trim() !== savedUsernameRef.current.trim() ||
    pendingFileRef.current !== null;

  // Return button label to "Save" as soon as the user makes another change.
  useEffect(() => {
    if (isDirty && phase === "saved") setPhase("idle");
  }, [isDirty, phase]);

  // Warn on browser refresh / tab close when there are unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // Escape closes the discard dialog (= keep editing).
  useEffect(() => {
    if (!showDiscard) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowDiscard(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDiscard]);

  function handleBackClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isDirty) {
      e.preventDefault();
      setShowDiscard(true);
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    // Reset so the same file can be re-picked after cancelling.
    e.target.value = "";
  }

  function handleCropApply(blob: Blob) {
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    pendingFileRef.current = file;
    setAvatarSrc(URL.createObjectURL(blob));
    setCropSrc(null);
  }

  function handleCropCancel() {
    setCropSrc(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setPhase("loading");
    setError("");
    try {
      // Multipart: send the (possibly unchanged) username and the file only if
      // one was picked. Backend reuses the HTML route's validation + messages.
      const form = new FormData();
      form.append("username", username.trim());
      if (pendingFileRef.current) form.append("profile_pic", pendingFileRef.current);

      const updated = await api.updateProfile(form);
      setUser(updated); // refresh AuthContext so profile/navbar reflect changes
      savedUsernameRef.current = username.trim();
      pendingFileRef.current = null;
      setPhase("saved");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again."
      );
      setPhase("idle");
    }
  }

  const counts = user?.counts ?? { played: 0, wishlist: 0, reviews: 0 };

  return (
    <RequireAuth>
    <div className={styles.page}>

      {/* ── Nav ── */}
      <nav className={styles.nav} aria-label="Main navigation">
        <div className={styles.navMeta}>
          <a href="/" className={styles.navLink}>Checkpoint</a>
          <span className={styles.navSep} aria-hidden="true">·</span>
          <span>Issue 001</span>
          <span className={styles.navSep} aria-hidden="true">·</span>
          <span>MMXXVI</span>
        </div>
        <div className={styles.navAuth}>
          <a href="/profile" className={styles.navLink} onClick={handleBackClick}>← Profile</a>
        </div>
      </nav>

      <main>
        <section className={styles.profileSection} aria-label="Edit profile">
          <form className={styles.profileHeader} onSubmit={handleSave} noValidate>

            {/* ── Avatar upload ── */}
            <div className={styles.avatarContainer}>
              <button
                type="button"
                className={styles.avatarWrap}
                onClick={() => fileRef.current?.click()}
                aria-label="Change profile picture"
              >
                <Image
                  src={avatarSrc}
                  alt="Your profile picture"
                  fill
                  style={{ objectFit: "cover" }}
                  className={styles.avatar}
                  priority
                  sizes="148px"
                  unoptimized
                />
                <div className={styles.avatarOverlay} aria-hidden="true" />
                <div className={styles.avatarUploadHint} aria-hidden="true">
                  <span className={styles.avatarUploadLabel}>Change</span>
                </div>
              </button>

              {/* Camera badge — always visible, signals upload affordance */}
              <div className={styles.cameraBadge} aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" fill="currentColor"/>
                  <circle cx="12" cy="13" r="4" fill="var(--accent)" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="13" r="1.5" fill="currentColor"/>
                </svg>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className={styles.fileInput}
              tabIndex={-1}
              aria-hidden="true"
            />

            {/* ── Meta ── */}
            <div className={styles.profileMeta}>
              <div className={styles.profileTopRow}>

                <div className={styles.usernameWrap}>
                  <span className={styles.usernameAt}>@</span>
                  <input
                    className={styles.usernameInput}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    aria-label="Username"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={32}
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className={`${styles.saveBtn}${phase === "saved" ? ` ${styles.saveBtnSaved}` : ""}`}
                  disabled={phase === "loading"}
                >
                  {phase === "loading" ? "Saving…" : phase === "saved" ? "Saved" : "Save"}
                </button>

              </div>

              {error && <p className={styles.errorMsg} role="alert">{error}</p>}

              <div className={styles.statsRule} aria-hidden="true" />

              <div className={styles.stats} aria-label="Profile statistics">
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{counts.played}</span>
                  <span className={styles.statLabel}>played</span>
                </div>
                <span className={styles.statDivider} aria-hidden="true">·</span>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{counts.wishlist}</span>
                  <span className={styles.statLabel}>wishlist</span>
                </div>
                <span className={styles.statDivider} aria-hidden="true">·</span>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{counts.reviews}</span>
                  <span className={styles.statLabel}>reviews</span>
                </div>
              </div>
            </div>

          </form>
        </section>
      </main>
    </div>
      {cropSrc && (
        <CropModal
          src={cropSrc}
          onApply={handleCropApply}
          onCancel={handleCropCancel}
        />
      )}

      {showDiscard && (
        <div
          className={styles.discardOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Discard changes"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDiscard(false); }}
        >
          <div className={styles.discardPanel}>
            <p className={styles.discardTitle}>Discard changes?</p>
            <p className={styles.discardSub}>Your edits will be lost.</p>
            <div className={styles.discardActions}>
              <button
                type="button"
                className={styles.discardCancelBtn}
                onClick={() => setShowDiscard(false)}
              >
                Keep editing
              </button>
              <button
                type="button"
                className={styles.discardConfirmBtn}
                onClick={() => router.push("/profile")}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </RequireAuth>
  );
}
