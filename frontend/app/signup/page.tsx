"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import CropMarks from "../components/CropMarks";
import DustParticles from "../components/DustParticles";
import { useAuth } from "../contexts/auth";
import { ApiError } from "../lib/api";
import styles from "./signup.module.css";

type Phase = "idle" | "loading" | "success" | "error";

interface FormFields {
  username: string;
  email: string;
  password: string;
  confirm: string;
}

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

function validate(f: FormFields): FieldErrors {
  const e: FieldErrors = {};
  if (!f.username.trim())                e.username = "Required";
  else if (f.username.trim().length < 3) e.username = "3 characters minimum";
  if (!f.email.trim())                   e.email = "Required";
  else if (!f.email.includes("@"))       e.email = "Enter a valid email";
  if (!f.password)                       e.password = "Required";
  else if (f.password.length < 8)        e.password = "8 characters minimum";
  if (!f.confirm)                        e.confirm = "Required";
  else if (f.confirm !== f.password)     e.confirm = "Passwords don't match";
  return e;
}

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [phase, setPhase]     = useState<Phase>("idle");
  const [dots, setDots]       = useState("");
  const [fields, setFields]   = useState<FormFields>({ username: "", email: "", password: "", confirm: "" });
  const [errors, setErrors]   = useState<FieldErrors>({});
  const [formErr, setFormErr] = useState("");

  const emailRef    = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef  = useRef<HTMLInputElement>(null);

  // Heading flicker — keeps --flicker on [data-signup-lamp] for the text-shadow
  useEffect(() => {
    const el = document.querySelector("[data-signup-lamp]") as HTMLElement | null;
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
      // Real registration: the backend reuses the same Signup form validators,
      // so server-side uniqueness errors ("Ooops, username already exists")
      // come back keyed by field and map straight onto our inline field errors.
      await signup(fields.username.trim(), fields.email.trim(), fields.password, fields.confirm);
      setPhase("success");
      router.push("/profile");
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setErrors(err.fields as FieldErrors);
      } else {
        setFormErr(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      }
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
    phase === "loading" ? `Processing${dots}` :
    phase === "success" ? "Welcome —" :
    "Begin tracking";

  return (
    <>
      <CropMarks />

      <div className={styles.page} data-signup-lamp>
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
            <a href="/login" className={styles.navLink}>Login</a>
          </div>
        </nav>

        <div className={styles.content}>

          {/* ── Form column ── */}
          <main className={styles.formSide} aria-label="Create an account">
            <header className={styles.formHeader}>
              <p className={styles.issueLabel}>New reader</p>
              <h1 className={styles.heading}>
                First<br />issue.
              </h1>
              <p className={styles.subline}>Create your record.</p>
            </header>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.fields}>

                {/* Username */}
                <div className={styles.fieldGroup}>
                  <label htmlFor="username" className={styles.fieldLabel}>Username</label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    data-field="username"
                    autoComplete="username"
                    className={`${styles.fieldInput}${errors.username ? " " + styles.fieldInputError : ""}`}
                    value={fields.username}
                    onChange={handleChange("username")}
                    onKeyDown={advanceOnEnter(emailRef)}
                    disabled={disabled}
                    aria-describedby={errors.username ? "err-username" : undefined}
                    aria-invalid={!!errors.username}
                  />
                  {errors.username && (
                    <span id="err-username" className={styles.fieldErrorMsg} role="alert">
                      {errors.username}
                    </span>
                  )}
                </div>

                {/* Email */}
                <div className={styles.fieldGroup}>
                  <label htmlFor="email" className={styles.fieldLabel}>Email</label>
                  <input
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="email"
                    data-field="email"
                    autoComplete="email"
                    className={`${styles.fieldInput}${errors.email ? " " + styles.fieldInputError : ""}`}
                    value={fields.email}
                    onChange={handleChange("email")}
                    onKeyDown={advanceOnEnter(passwordRef)}
                    disabled={disabled}
                    aria-describedby={errors.email ? "err-email" : undefined}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <span id="err-email" className={styles.fieldErrorMsg} role="alert">
                      {errors.email}
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
                    autoComplete="new-password"
                    className={`${styles.fieldInput}${errors.password ? " " + styles.fieldInputError : ""}`}
                    value={fields.password}
                    onChange={handleChange("password")}
                    onKeyDown={advanceOnEnter(confirmRef)}
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

                {/* Confirm password */}
                <div className={styles.fieldGroup}>
                  <label htmlFor="confirm" className={styles.fieldLabel}>Confirm password</label>
                  <input
                    ref={confirmRef}
                    id="confirm"
                    name="confirm"
                    type="password"
                    data-field="confirm"
                    autoComplete="new-password"
                    className={`${styles.fieldInput}${errors.confirm ? " " + styles.fieldInputError : ""}`}
                    value={fields.confirm}
                    onChange={handleChange("confirm")}
                    onKeyDown={submitOnEnter}
                    disabled={disabled}
                    aria-describedby={errors.confirm ? "err-confirm" : undefined}
                    aria-invalid={!!errors.confirm}
                  />
                  {errors.confirm && (
                    <span id="err-confirm" className={styles.fieldErrorMsg} role="alert">
                      {errors.confirm}
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

            <p className={styles.loginPrompt}>
              Already have an account?{" "}
              <a href="/login" className={styles.loginLink}>Log in</a>
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
                  Your games.<br />
                  Your words.<br />
                  Your record.
                </blockquote>
              </div>
              <div className={styles.asideBottom}>
                <div className={styles.asideBottomRule} aria-hidden="true" />
                <p className={styles.asideFooter}>A game journal · Est. MMXXVI</p>
              </div>
            </div>
            <span className={styles.asideWatermark} aria-hidden="true">01</span>
          </aside>

        </div>
      </div>
    </>
  );
}
