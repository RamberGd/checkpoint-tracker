"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import CropMarks from "../components/CropMarks";
import DustParticles from "../components/DustParticles";
import { useAuth } from "../contexts/auth";
import { ApiError } from "../lib/api";
import styles from "./login.module.css";

type Phase = "idle" | "loading" | "success" | "error";

interface FormFields {
  identifier: string;
  password: string;
}

interface FieldErrors {
  identifier?: string;
  password?: string;
}

function validate(f: FormFields): FieldErrors {
  const e: FieldErrors = {};
  if (!f.identifier.trim()) e.identifier = "Required";
  if (!f.password)          e.password   = "Required";
  return e;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phase, setPhase]     = useState<Phase>("idle");
  const [dots, setDots]       = useState("");
  const [fields, setFields]   = useState<FormFields>({ identifier: "", password: "" });
  const [errors, setErrors]   = useState<FieldErrors>({});
  const [formErr, setFormErr] = useState("");

  const passwordRef = useRef<HTMLInputElement>(null);

  // Heading flicker — keeps --flicker on [data-login-lamp]
  useEffect(() => {
    const el = document.querySelector("[data-login-lamp]") as HTMLElement | null;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--flicker", "0.92");
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    function step() {
      const r = Math.random();
      let v: number, d: number;
      if (r < 0.58)      { v = 0.88 + Math.random() * 0.12; d = 450 + Math.random() * 950; }
      else if (r < 0.78) { v = 0.70 + Math.random() * 0.22; d = 110 + Math.random() * 230; }
      else if (r < 0.92) { v = 0.32 + Math.random() * 0.38; d = 45  + Math.random() * 95;  }
      else               { v = 0.05 + Math.random() * 0.12; d = 35  + Math.random() * 60;  }
      el!.style.setProperty("--flicker", v.toFixed(3));
      timer = setTimeout(step, d);
    }
    el.style.setProperty("--flicker", "0.60");
    timer = setTimeout(step, 200);
    return () => clearTimeout(timer);
  }, []);

  // Animated ellipsis during loading
  useEffect(() => {
    if (phase !== "loading") { setDots(""); return; }
    let n = 0;
    const id = setInterval(() => { n = (n + 1) % 4; setDots(".".repeat(n)); }, 380);
    return () => clearInterval(id);
  }, [phase]);

  const handleChange = useCallback(
    (field: keyof FormFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields(prev => ({ ...prev, [field]: e.target.value }));
      setErrors(prev => ({ ...prev, [field]: undefined }));
      setFormErr("");
    },
    []
  );

  async function doSubmit() {
    const errs = validate(fields);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setPhase("loading");
    setFormErr("");
    try {
      // Real auth: starts the Flask-Login session cookie. On success the
      // AuthContext now holds the user, so /profile renders the real account.
      await login(fields.identifier.trim(), fields.password);
      setPhase("success");
      router.push("/profile");
    } catch (err) {
      // Surface the backend's own message ("Invalid username/email or password").
      setFormErr(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setPhase("idle");
    }
  }

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); doSubmit(); }

  function advanceOnEnter(next: React.RefObject<HTMLInputElement | null>) {
    return (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") { e.preventDefault(); next.current?.focus(); }
    };
  }

  function submitOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); doSubmit(); }
  }

  const disabled = phase === "loading" || phase === "success";

  const btnLabel =
    phase === "loading" ? `Verifying${dots}` :
    phase === "success" ? "Welcome back —" :
    "Open journal";

  return (
    <>
      <CropMarks />

      <div className={styles.page} data-login-lamp>
        <DustParticles />

        {/* Nav */}
        <nav className={styles.nav} aria-label="Main navigation">
          <div className={styles.navMeta}>
            <a href="/" className={styles.navLink}>Checkpoint</a>
            <span className={styles.navSep} aria-hidden="true">·</span>
            <span>Issue 001</span>
            <span className={styles.navSep} aria-hidden="true">·</span>
            <span>MMXXVI</span>
          </div>
          <div className={styles.navAuth}>
            <a href="/signup" className={styles.navLink}>Sign up</a>
          </div>
        </nav>

        <div className={styles.content}>

          {/* ── Form column ── */}
          <main className={styles.formSide} aria-label="Sign in to your account">
            <header className={styles.formHeader}>
              <p className={styles.issueLabel}>Returning reader</p>
              <h1 className={styles.heading}>
                Return.
              </h1>
              <p className={styles.subline}>Continue your record.</p>
            </header>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.fields}>

                {/* Username or email */}
                <div className={styles.fieldGroup}>
                  <label htmlFor="identifier" className={styles.fieldLabel}>Username or email</label>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    data-field="identifier"
                    autoComplete="username"
                    className={`${styles.fieldInput}${errors.identifier ? " " + styles.fieldInputError : ""}`}
                    value={fields.identifier}
                    onChange={handleChange("identifier")}
                    onKeyDown={advanceOnEnter(passwordRef)}
                    disabled={disabled}
                    aria-describedby={errors.identifier ? "err-identifier" : undefined}
                    aria-invalid={!!errors.identifier}
                  />
                  {errors.identifier && (
                    <span id="err-identifier" className={styles.fieldErrorMsg} role="alert">
                      {errors.identifier}
                    </span>
                  )}
                </div>

                {/* Password */}
                <div className={styles.fieldGroup}>
                  <label htmlFor="password" className={styles.fieldLabel}>Password</label>
                  <input
                    ref={passwordRef}
                    id="password"
                    name="password"
                    type="password"
                    data-field="password"
                    autoComplete="current-password"
                    className={`${styles.fieldInput}${errors.password ? " " + styles.fieldInputError : ""}`}
                    value={fields.password}
                    onChange={handleChange("password")}
                    onKeyDown={submitOnEnter}
                    disabled={disabled}
                    aria-describedby={errors.password ? "err-password" : undefined}
                    aria-invalid={!!errors.password}
                  />
                  {errors.password && (
                    <span id="err-password" className={styles.fieldErrorMsg} role="alert">
                      {errors.password}
                    </span>
                  )}
                </div>

              </div>

              {formErr && <p className={styles.formErrorMsg} role="alert">{formErr}</p>}

              <button
                type="submit"
                className={`${styles.submitBtn}${phase === "success" ? " " + styles.submitBtnSuccess : ""}`}
                disabled={disabled}
                aria-live="polite"
              >
                {btnLabel}
              </button>
            </form>

            <p className={styles.signupPrompt}>
              New here?{" "}
              <a href="/signup" className={styles.signupLink}>Create an account</a>
            </p>
          </main>

          {/* ── Editorial aside ── */}
          <aside className={styles.aside} aria-label="About CheckPoint">
            <div className={styles.asideInner}>
              <div className={styles.asideTop}>
                <p className={styles.asideMasthead}>CheckPoint</p>
                <div className={styles.asideTopRule} aria-hidden="true" />
              </div>
              <div className={styles.asideCenter}>
                <p className={styles.asideVolume}>Vol. I · Issue 001</p>
                <blockquote className={styles.asidePullQuote}>
                  Where did<br />
                  you leave<br />
                  off?
                </blockquote>
              </div>
              <div className={styles.asideBottom}>
                <div className={styles.asideBottomRule} aria-hidden="true" />
                <p className={styles.asideFooter}>A game journal · Est. MMXXVI</p>
              </div>
            </div>
            <span className={styles.asideWatermark} aria-hidden="true">02</span>
          </aside>

        </div>
      </div>
    </>
  );
}
