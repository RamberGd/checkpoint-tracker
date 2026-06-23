"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Reveal from "../components/Reveal";
import Navbar from "../components/Navbar";
import DustParticles from "../components/DustParticles";
import EmptyShelf from "../components/EmptyShelf";
import { api, ApiError, type GameSummary } from "../lib/api";
import styles from "./wishlist.module.css";
import RequireAuth from "../components/RequireAuth";

const COLS = 6;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function GameBlock({ id, title, cover }: { id: number; title: string; cover: string | null }) {
  return (
    <Link href={`/game/${id}`} className={styles.gameBlock} aria-label={title}>
      <div className={styles.coverWrap}>
        {cover && (
          <Image
            src={cover}
            alt={title}
            fill
            sizes="(max-width: 420px) 44vw, (max-width: 660px) 30vw, (max-width: 900px) 22vw, (max-width: 1200px) 18vw, 14vw"
            style={{ objectFit: "cover" }}
            className={styles.cover}
          />
        )}
        <div className={styles.coverOverlay} aria-hidden="true" />
      </div>
      <span className={styles.title}>{title}</span>
    </Link>
  );
}

export default function WishlistPage() {
  const router = useRouter();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .list("wishlist")
      .then((g) => active && setGames(g))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else console.error("Failed to load wishlist", err);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [router]);

  const rows = chunk(games, COLS);

  return (
    <RequireAuth>
      <div className={styles.page}>
      <DustParticles />
      <Navbar />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.heading}>Wishlist</h1>
          <p className={styles.count}>
            <span className={styles.countDash}>—</span>
            {games.length} games
          </p>
        </div>
        <div className={styles.rule} aria-hidden="true" />
      </header>

      <main className={styles.main}>
        {!loading && games.length === 0 ? (
          <EmptyShelf line="What you're waiting for." />
        ) : (
          rows.map((row, rowIdx) => (
            <Reveal key={rowIdx} delay={rowIdx * 55}>
              <div className={styles.row}>
                {row.map((g) => (
                  <GameBlock key={g.id} id={g.id} title={g.title} cover={g.cover} />
                ))}
              </div>
            </Reveal>
          ))
        )}
      </main>

      <footer className={styles.footer}>
        <Link href="/profile" className={styles.backLink}>
          ← Profile
        </Link>
      </footer>
    </div>
    </RequireAuth>
  );
}
