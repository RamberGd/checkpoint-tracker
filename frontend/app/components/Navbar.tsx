"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSearch } from "../contexts/search";
import { useAuth } from "../contexts/auth";
import styles from "./Navbar.module.css";

interface NavbarProps {
  variant?: "landing" | "auth" | "app";
}

export default function Navbar({ variant = "app" }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, openSearch } = useSearch();
  const { logout } = useAuth();

  // Log out is an action (clears the Flask-Login session), not navigation, so
  // it calls the API then sends the user to the landing page.
  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.push("/");
    }
  }

  function linkClass(href: string) {
    return pathname === href
      ? `${styles.navLink} ${styles.navLinkActive}`
      : styles.navLink;
  }

  const searchClass = isOpen
    ? `${styles.navLink} ${styles.navLinkActive}`
    : styles.navLink;

  if (variant === "landing") {
    return (
      <nav className={styles.nav} aria-label="Main navigation">
        <div className={styles.navMeta}>
          <Link href="/" className={linkClass("/")}>Checkpoint</Link>
          <span className={`${styles.navSep} ${styles.navMetaSecondary}`} aria-hidden="true">·</span>
          <span className={styles.navMetaSecondary}>Issue 001</span>
          <span className={`${styles.navSep} ${styles.navMetaSecondary}`} aria-hidden="true">·</span>
          <span className={styles.navMetaSecondary}>MMXXVI</span>
          <span className={`${styles.navSep} ${styles.navMetaSecondary}`} aria-hidden="true">·</span>
          <span className={styles.navMetaSecondary}>Games</span>
          <span className={`${styles.navSep} ${styles.navMetaSecondary}`} aria-hidden="true">·</span>
          <span className={styles.navMetaSecondary}>Culture</span>
          <span className={`${styles.navSep} ${styles.navMetaSecondary}`} aria-hidden="true">·</span>
          <span className={styles.navMetaSecondary}>Memory</span>
        </div>
        <div className={styles.navAuth}>
          <Link href="/login" className={linkClass("/login")} aria-label="Log in">Login</Link>
          <span className={styles.navSep} aria-hidden="true">·</span>
          <Link href="/signup" className={linkClass("/signup")} aria-label="Create an account">Sign up</Link>
        </div>
      </nav>
    );
  }

  if (variant === "auth") {
    return (
      <nav className={styles.nav} aria-label="Main navigation">
        <div className={styles.navMeta}>
          <Link href="/" className={linkClass("/")}>Checkpoint</Link>
          <span className={styles.navSep} aria-hidden="true">·</span>
          <button onClick={openSearch} className={searchClass}>Search</button>
        </div>
      </nav>
    );
  }

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <div className={styles.navMeta}>
        <Link href="/profile" className={linkClass("/profile")}>Checkpoint</Link>
        <span className={`${styles.navSep} ${styles.navMetaSecondary}`} aria-hidden="true">·</span>
        <span className={styles.navMetaSecondary}>Issue 001</span>
        <span className={`${styles.navSep} ${styles.navMetaSecondary}`} aria-hidden="true">·</span>
        <span className={styles.navMetaSecondary}>MMXXVI</span>
      </div>
      <div className={styles.navAuth}>
        <button onClick={openSearch} className={searchClass} aria-label="Search games">Search</button>
        <span className={`${styles.navSep} ${styles.navAuthSecondary}`} aria-hidden="true">·</span>
        <Link href="/sales" className={`${linkClass("/sales")} ${styles.navAuthSecondary}`}>What&apos;s On Sale</Link>
        <span className={`${styles.navSep} ${styles.navAuthSecondary}`} aria-hidden="true">·</span>
        <Link href="/profile" className={`${linkClass("/profile")} ${styles.navAuthSecondary}`}>Profile</Link>
        <span className={`${styles.navSep} ${styles.navAuthSecondary}`} aria-hidden="true">·</span>
        <Link href="/ai-chat" className={`${linkClass("/ai-chat")} ${styles.navAuthSecondary}`}>AI Chat</Link>
        <span className={`${styles.navSep} ${styles.navAuthSecondary}`} aria-hidden="true">·</span>
        <button onClick={handleLogout} className={`${styles.navLink} ${styles.navAuthSecondary}`}>Log out</button>
      </div>
    </nav>
  );
}
