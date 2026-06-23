"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Reveal from "../components/Reveal";
import Navbar from "../components/Navbar";
import { api, ApiError, type Profile } from "../lib/api";
import styles from "./profile.module.css";
import RequireAuth from "../components/RequireAuth";

// Backend-owned fallback avatar (served via the /static proxy) for users who
// have not uploaded a profile picture.
const DEFAULT_AVATAR = "/static/images/fallback_avatar.svg";

interface Game {
  id: number;
  title: string;
  cover: string | null;
}

const GHOST_COUNT = 5;
const GHOST_START = 0.55;
const GHOST_END = 0.12;

function GameRow({ games, emptyLine }: { games: Game[]; emptyLine?: string }) {
  if (games.length === 0 && emptyLine) {
    return (
      <Reveal delay={80}>
        <div className={styles.gamesRow} aria-hidden="true">
          {Array.from({ length: GHOST_COUNT }).map((_, i) => (
            <div
              key={i}
              className={styles.gameCoverWrap}
              style={{
                opacity:
                  GHOST_START -
                  (GHOST_START - GHOST_END) * (i / (GHOST_COUNT - 1)),
              }}
            />
          ))}
        </div>
        <p className={styles.emptyLine}>{emptyLine}</p>
      </Reveal>
    );
  }

  return (
    <Reveal delay={80}>
      <div className={styles.gamesRow}>
        {games.map((g) => (
          <a key={g.id} href={`/game/${g.id}`} className={styles.gameBlock}>
            <div className={styles.gameCoverWrap}>
              {g.cover && (
                <Image
                  src={g.cover}
                  alt={g.title}
                  fill
                  style={{ objectFit: "cover" }}
                  className={styles.gameCover}
                  sizes="(max-width: 600px) 45vw, 20vw"
                />
              )}
              <div className={styles.gameCoverOverlay} aria-hidden="true" />
            </div>
            <span className={styles.gameTitle}>{g.title}</span>
          </a>
        ))}
      </div>
    </Reveal>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load the real profile (identity, shortlists, reviews) on mount. A 401 means
  // the session expired / never existed, so we send the user to log in.
  useEffect(() => {
    let active = true;
    api
      .profile()
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        console.error("Failed to load profile", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  // Delete a review the user owns, then drop it from local state and the count.
  async function handleDeleteReview(reviewId: number) {
    try {
      await api.deleteReview(reviewId);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              reviews: prev.reviews.filter((r) => r.id !== reviewId),
              user: {
                ...prev.user,
                counts: { ...prev.user.counts, reviews: prev.user.counts.reviews - 1 },
              },
            }
          : prev
      );
    } catch (err) {
      console.error("Failed to delete review", err);
    }
  }

  if (loading || !profile) {
    return (
      <div className={styles.page}>
        <Navbar />
        <main>
          <section className={styles.profileSection} aria-label="Profile">
            <p className={styles.emptyLine}>Loading…</p>
          </section>
        </main>
      </div>
    );
  }

  const { user, favourites, wishlist, played, reviews } = profile;

  return (
    <RequireAuth>
    <div className={styles.page}>

      <Navbar />

      <main>

        {/* ── Profile header ── */}
        <section className={styles.profileSection} aria-label="Profile">
          <div className={styles.profileHeader}>

            <div className={styles.avatarWrap}>
              <Image
                src={user.avatarUrl ?? DEFAULT_AVATAR}
                alt={`${user.username}'s profile picture`}
                fill
                style={{ objectFit: "cover" }}
                className={styles.avatar}
                priority
                sizes="148px"
                unoptimized
              />
              <div className={styles.avatarOverlay} aria-hidden="true" />
            </div>

            <div className={styles.profileMeta}>
              <div className={styles.profileTopRow}>
                <h1 className={styles.username}>
                  <span className={styles.usernameAt}>@</span>
                  {user.username}
                </h1>
                <a href="/edit-profile" className={styles.editBtn}>
                  Edit profile
                </a>
              </div>

              <div className={styles.statsRule} aria-hidden="true" />

              <div className={styles.stats} aria-label="Profile statistics">
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{user.counts.played}</span>
                  <span className={styles.statLabel} aria-label="games played">played</span>
                </div>
                <span className={styles.statDivider} aria-hidden="true">·</span>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{user.counts.wishlist}</span>
                  <span className={styles.statLabel} aria-label="games on wishlist">wishlist</span>
                </div>
                <span className={styles.statDivider} aria-hidden="true">·</span>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{user.counts.reviews}</span>
                  <span className={styles.statLabel} aria-label="reviews written">reviews</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── Game lists ── */}
        {([
          { key: "favourites", title: "Favourites", href: "/favourites", games: favourites, emptyLine: "Nothing shelved yet." },
          { key: "wishlist",   title: "Wishlist",   href: "/wishlist",   games: wishlist,   emptyLine: "Nothing queued." },
          { key: "played",     title: "Played",     href: "/played",     games: played,     emptyLine: "The log is empty." },
        ] as const).map(({ key, title, href, games, emptyLine }) => (
          <section key={key} className={styles.listSection} aria-label={title}>
            <div className={styles.listHeader}>
              <h2 className={styles.listTitle}>{title}</h2>
              <a href={href} className={styles.viewMore} aria-label={`View all ${title}`}>
                View all —
              </a>
            </div>
            <GameRow games={games} emptyLine={emptyLine} />
          </section>
        ))}

        {/* ── Reviews ── */}
        <section className={styles.reviewsSection} aria-label="Reviews" id="reviews">
          <div className={styles.reviewsInner}>
            <h2 className={styles.reviewsTitle}>Reviews</h2>
            {reviews.length === 0 ? (
              <p className={styles.emptyLine}>No reviews written yet.</p>
            ) : (
              <div className={styles.reviewsList}>
                {reviews.map((r, i) => (
                  <Reveal key={r.id} delay={i * 90}>
                    <article className={styles.reviewItem}>
                      <a href={`/game/${r.gameId}`} className={styles.reviewThumbWrap} aria-label={`Go to ${r.gameTitle}`}>
                        {r.cover && (
                          <Image
                            src={r.cover}
                            alt={`${r.gameTitle} cover`}
                            fill
                            style={{ objectFit: "cover" }}
                            className={styles.reviewThumb}
                            sizes="80px"
                          />
                        )}
                      </a>
                      <a href={`/discussion/${r.id}`} className={styles.reviewBody}>
                        <div className={styles.reviewMeta}>
                          <span className={styles.reviewGameTitle}>{r.gameTitle}</span>
                          <span className={styles.reviewRating}>{r.rating} / 5</span>
                        </div>
                        <p className={styles.reviewText}>{r.comment}</p>
                      </a>
                      <button
                        className={styles.reviewDelete}
                        onClick={() => handleDeleteReview(r.id)}
                        aria-label={`Delete review of ${r.gameTitle}`}
                      >
                        Delete
                      </button>
                    </article>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
    </RequireAuth>
  );
}
