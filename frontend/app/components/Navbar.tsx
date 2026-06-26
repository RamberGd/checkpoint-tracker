"use client";

import { useState, useEffect } from "react";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => { setIsMenuOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);

  async function handleLogout() {
    setIsMenuOpen(false);
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

  function menuLinkClass(href: string) {
    return pathname === href
      ? `${styles.menuLink} ${styles.menuLinkActive}`
      : styles.menuLink;
  }

  const searchClass = isOpen
    ? `${styles.navLink} ${styles.navLinkActive}`
    : styles.navLink;

  if (variant === "landing") {
    return (
      <nav className={styles.nav} aria-label="Main navigation">
        <Link
          href="/"
          className={`${styles.masthead}${pathname === "/" ? " " + styles.mastheadActive : ""}`}
          aria-label="Checkpoint — home"
        >
          <span className={styles.mastheadWord}>Checkpoint</span>
          <span className={styles.mastheadStrap} aria-hidden="true">Games · Culture · Memory</span>
        </Link>
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
    <>
      <nav className={styles.nav} aria-label="Main navigation">
        <div className={styles.navMeta}>
          <Link href="/profile" className={linkClass("/profile")}>Checkpoint</Link>
          <span className={`${styles.navSep} ${styles.navMetaSecondary}`} aria-hidden="true">·</span>
          <span className={styles.navMetaSecondary}>Issue 001</span>
          <span className={`${styles.navSep} ${styles.navMetaSecondary}`} aria-hidden="true">·</span>
          <span className={styles.navMetaSecondary}>MMXXVI</span>
        </div>
        <div className={styles.navAuth}>
          <button onClick={openSearch} className={`${searchClass} ${styles.navAuthDesktop}`} aria-label="Search games">Search</button>
          <span className={`${styles.navSep} ${styles.navAuthSecondary}`} aria-hidden="true">·</span>
          <Link href="/sales" className={`${linkClass("/sales")} ${styles.navAuthSecondary}`}>What&apos;s On Sale</Link>
          <span className={`${styles.navSep} ${styles.navAuthSecondary}`} aria-hidden="true">·</span>
          <Link href="/profile" className={`${linkClass("/profile")} ${styles.navAuthSecondary}`}>Profile</Link>
          <span className={`${styles.navSep} ${styles.navAuthSecondary}`} aria-hidden="true">·</span>
          <Link href="/ai-chat" className={`${linkClass("/ai-chat")} ${styles.navAuthSecondary}`}>AI Chat</Link>
          <span className={`${styles.navSep} ${styles.navAuthSecondary}`} aria-hidden="true">·</span>
          <button onClick={handleLogout} className={`${styles.navLink} ${styles.navAuthSecondary}`}>Log out</button>
          <button
            className={styles.menuToggle}
            onClick={() => setIsMenuOpen(v => !v)}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {isMenuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </nav>

      <div
        className={`${styles.menuPanel} ${isMenuOpen ? styles.menuPanelOpen : ""}`}
        aria-hidden={!isMenuOpen}
      >
        <nav className={styles.menuNav} aria-label="Mobile navigation">
          <div className={styles.menuLinks}>
            <button
              onClick={() => { openSearch(); setIsMenuOpen(false); }}
              className={styles.menuLink}
            >
              <span className={styles.menuSlug}>01</span>
              Search
            </button>
            <Link href="/profile" className={menuLinkClass("/profile")} onClick={() => setIsMenuOpen(false)}>
              <span className={styles.menuSlug}>02</span>
              Profile
            </Link>
            <Link href="/sales" className={menuLinkClass("/sales")} onClick={() => setIsMenuOpen(false)}>
              <span className={styles.menuSlug}>03</span>
              On Sale
            </Link>
            <Link href="/ai-chat" className={menuLinkClass("/ai-chat")} onClick={() => setIsMenuOpen(false)}>
              <span className={styles.menuSlug}>04</span>
              AI Chat
            </Link>
          </div>
          <button onClick={handleLogout} className={styles.menuLogout}>
            Log Out
          </button>
        </nav>
      </div>
    </>
  );
}
