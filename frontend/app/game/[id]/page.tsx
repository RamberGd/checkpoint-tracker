"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Reveal from "../../components/Reveal";
import Navbar from "../../components/Navbar";
import LibraryToast, { ToastAction } from "../../components/LibraryToast";
import {
  api,
  ApiError,
  type GameDetail,
  type PriceDTO,
  type ReviewDTO,
} from "../../lib/api";
import styles from "./game.module.css";
import RequireAuth from "../../components/RequireAuth";

// ── Roman numeral helpers ──────────────────────────────────────────
const ROMAN = ["I", "II", "III", "IV", "V"] as const;
function toRoman(n: number): string {
  return ROMAN[Math.round(Math.max(1, Math.min(5, n))) - 1];
}

// ── Rating display ─────────────────────────────────────────────────
function RatingBar({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className={styles.ratingBarGroup} aria-hidden="true">
      <span className={styles.ratingNumeral}>{rating.toFixed(1)}</span>
      <span
        className={styles.ratingBar}
        style={{ "--rating-pct": `${(rating / max) * 100}%` } as React.CSSProperties}
      />
    </span>
  );
}

function formatReleaseDate(iso: string | null): string {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "Unknown"
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Page ──────────────────────────────────────────────────────────
export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  // Route param is the IGDB id (search + list links all carry the numeric id).
  const gameId = Number(params.id);

  const [game, setGame] = useState<GameDetail | null>(null);
  const [prices, setPrices] = useState<PriceDTO[]>([]);
  const [reviews, setReviews] = useState<ReviewDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Library membership flags — seeded from the game payload, then kept in sync
  // with whatever each toggle endpoint returns.
  const [played, setPlayed] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [favourited, setFavourited] = useState(false);
  const [toast, setToast] = useState<ToastAction>(null);

  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "posted">("idle");
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Load game detail + prices on mount. Prices are fetched separately because
  // the ITAD round-trip is slower and must not block the game page rendering.
  useEffect(() => {
    if (!Number.isFinite(gameId)) {
      setLoadError("Invalid game.");
      setLoading(false);
      return;
    }
    let active = true;
    api
      .game(gameId)
      .then((g) => {
        if (!active) return;
        setGame(g);
        setReviews(g.reviews);
        setPlayed(g.status.played);
        setWishlisted(g.status.wishlisted);
        setFavourited(g.status.favourited);
        setLoading(false);

        // Fetch prices ONLY after the game has loaded. The game request caches
        // the IGDB record (get_create_game), so by now the Game row exists and
        // the prices request can't race it into a duplicate INSERT. Prices are
        // non-blocking and degrade gracefully — a failure just empties the grid.
        api
          .prices(gameId)
          .then((p) => active && setPrices(p))
          .catch(() => active && setPrices([]));
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setLoadError(err instanceof ApiError ? err.message : "Could not load game details.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [gameId, router]);

  // Each toggle returns the authoritative {played,wishlisted,favourited} so the
  // three buttons stay consistent (e.g. favouriting implies played server-side).
  function syncStatus(s: { played: boolean; wishlisted: boolean; favourited: boolean }) {
    setPlayed(s.played);
    setWishlisted(s.wishlisted);
    setFavourited(s.favourited);
  }

  async function onTogglePlayed() {
    const wasPlayed = played;
    try {
      syncStatus(await api.togglePlayed(gameId));
      if (!wasPlayed) setToast("played");
    } catch (err) {
      console.error("toggle played failed", err);
    }
  }

  async function onToggleWishlist() {
    const wasWishlisted = wishlisted;
    try {
      syncStatus(await api.toggleWishlist(gameId));
      if (!wasWishlisted) setToast("wishlist");
    } catch (err) {
      console.error("toggle wishlist failed", err);
    }
  }

  async function onToggleFavourite() {
    const wasFavourited = favourited;
    try {
      syncStatus(await api.toggleFavourite(gameId));
      if (!wasFavourited) setToast("favourites");
    } catch (err) {
      console.error("toggle favourite failed", err);
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRating) return;
    setReviewError(null);
    try {
      const created = await api.addReview(gameId, selectedRating, reviewText.trim());
      setReviews((prev) => [created, ...prev]);
      setSelectedRating(null);
      setReviewText("");
      setSubmitState("posted");
      setTimeout(() => setSubmitState("idle"), 2200);
    } catch (err) {
      // e.g. 409 "You have already reviewed this game." — show the backend text.
      setReviewError(err instanceof ApiError ? err.message : "Could not post your review.");
    }
  }

  async function deleteReview(id: number) {
    try {
      await api.deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("delete review failed", err);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <main>
          <section className={styles.hero} aria-label="Loading game">
            <p className={styles.kicker}>Loading…</p>
          </section>
        </main>
      </div>
    );
  }

  if (loadError || !game) {
    return (
      <div className={styles.page}>
        <Navbar />
        <main>
          <section className={styles.hero} aria-label="Error">
            <p className={styles.kicker}>{loadError ?? "Game not found."}</p>
          </section>
        </main>
      </div>
    );
  }

  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0;
  const isOnSale = prices.some((p) => p.cut > 0);

  return (
    <RequireAuth>
    <div className={styles.page}>

      <Navbar />

      <main>

        {/* ── Hero ── */}
        <section className={styles.hero} aria-label={game.title}>

          <Reveal variant="image" className={styles.coverCol}>
            <div className={styles.coverWrap}>
              {game.cover && (
                <Image
                  src={game.cover}
                  alt={`${game.title} cover art`}
                  fill
                  style={{ objectFit: "cover" }}
                  className={styles.cover}
                  priority
                  sizes="(max-width: 700px) 55vw, (max-width: 1100px) 32vw, 380px"
                />
              )}
              <div className={styles.coverOverlay} aria-hidden="true" />
            </div>
          </Reveal>

          <Reveal delay={120} className={styles.heroInfo}>

            <p className={styles.kicker}>
              {game.genres[0] ?? "Game"}
              {game.releaseDate ? `  ·  ${new Date(game.releaseDate).getFullYear()}` : ""}
            </p>

            <div className={styles.titleRow}>
              <h1 className={styles.gameTitle}>{game.title}</h1>
              {isOnSale && (
                <span className={styles.saleBadge} aria-label="Currently on sale">
                  On Sale
                </span>
              )}
            </div>

            <div className={styles.divider} aria-hidden="true" />

            {game.genres.length > 0 && (
              <div className={styles.genreRow} aria-label="Genres">
                {game.genres.map((g, i) => (
                  <span key={g} className={styles.genreGroup}>
                    <span className={styles.genreTag}>{g}</span>
                    {i < game.genres.length - 1 && (
                      <span className={styles.genrePipe} aria-hidden="true">
                        /
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}

            <div className={styles.releaseMeta}>
              <span className={styles.releaseLabel}>Released</span>
              <span className={styles.releaseDash} aria-hidden="true">—</span>
              <span className={styles.releaseDate}>{formatReleaseDate(game.releaseDate)}</span>
            </div>

            <a
              href="#reviews"
              className={styles.ratingDisplay}
              aria-label={`Average rating: ${avgRating.toFixed(1)} out of 5 — jump to reviews`}
            >
              <RatingBar rating={avgRating} />
              <span className={styles.ratingCount}>
                ({reviewCount}&nbsp;{reviewCount === 1 ? "review" : "reviews"})
              </span>
            </a>

            <div className={styles.divider} aria-hidden="true" />

            <div className={styles.actions}>
              <button
                className={`${styles.actionBtn} ${played ? styles.actionBtnActive : ""}`}
                onClick={onTogglePlayed}
                aria-pressed={played}
              >
                {played ? "Remove from Played" : "Mark as Played"}
              </button>
              <button
                className={`${styles.actionBtn} ${wishlisted ? styles.actionBtnActive : ""}`}
                onClick={onToggleWishlist}
                aria-pressed={wishlisted}
              >
                {wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              </button>
              <button
                className={`${styles.actionBtn} ${favourited ? styles.actionBtnActive : ""}`}
                onClick={onToggleFavourite}
                aria-pressed={favourited}
              >
                {favourited ? "Remove from Favourites" : "Add to Favourites"}
              </button>
            </div>

          </Reveal>
        </section>

        {/* ── Summary ── */}
        <section className={styles.summarySection} aria-label="About">
          <Reveal delay={40}>
            <div className={styles.summaryInner}>
              <h2 className={styles.summaryLabel}>About</h2>
              <div className={styles.summaryRule} aria-hidden="true" />
              <p className={styles.summaryText}>{game.summary ?? "No description available."}</p>
            </div>
          </Reveal>
        </section>

        {/* ── Reviews ── */}
        <section
          className={styles.reviewsSection}
          aria-label="Reviews"
          id="reviews"
        >
          <div className={styles.reviewsInner}>

            <div className={styles.reviewsHeader}>
              <h2 className={styles.reviewsTitle}>Reviews</h2>
              <span className={styles.reviewsCount} aria-label={`${reviewCount} reviews`}>
                {reviewCount}
              </span>
            </div>

            <div className={styles.reviewsList} role="list">
              {reviews.map((r, i) => (
                <Reveal key={r.id} delay={i * 75}>
                  <article className={styles.reviewItem} role="listitem">
                    <div className={styles.reviewLeft}>
                      <span className={styles.reviewerName}>{r.username}</span>
                      <span className={styles.reviewRating}>{toRoman(r.rating)}&thinsp;/&thinsp;V</span>
                      {r.isOwn && (
                        <button
                          className={styles.deleteBtn}
                          onClick={() => deleteReview(r.id)}
                          aria-label="Delete your review"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <div className={styles.reviewRight}>
                      {r.comment ? (
                        <p className={styles.reviewComment}>{r.comment}</p>
                      ) : (
                        <p className={styles.reviewComment} style={{ fontStyle: "normal", opacity: 0.65 }}>
                          <em>Rating only</em>
                        </p>
                      )}
                      <div className={styles.reviewFooter}>
                        <Link
                          href={`/discussion/${r.id}`}
                          className={styles.replyLink}
                          aria-label={`${r.replyCount} ${r.replyCount === 1 ? "reply" : "replies"} — open discussion`}
                        >
                          Reply&nbsp;({r.replyCount})&nbsp;↗
                        </Link>
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>

            {/* ── Write a review ── */}
            <Reveal delay={60}>
              <form
                className={styles.writeForm}
                onSubmit={submitReview}
                aria-label="Write a review"
              >
                <h3 className={styles.writeLabel}>Write a Review</h3>
                <div className={styles.writeRule} aria-hidden="true" />

                <div
                  className={styles.ratingPickerRow}
                  role="group"
                  aria-label="Your rating"
                >
                  <span className={styles.ratingPickerLabel}>Rating</span>
                  <div className={styles.ratingPicker}>
                    {ROMAN.map((r, i) => (
                      <button
                        key={r}
                        type="button"
                        className={`${styles.ratingBtn} ${selectedRating !== null && i + 1 <= selectedRating ? styles.ratingBtnActive : ""}`}
                        onClick={() => setSelectedRating(i + 1)}
                        aria-label={`Rate ${i + 1} out of 5`}
                        aria-pressed={selectedRating === i + 1}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <p className={styles.formHelper}>
                  A rating holds the moment. Words are optional.
                </p>

                <textarea
                  className={styles.textarea}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Write your thoughts — before the feeling fades."
                  rows={5}
                  aria-label="Your review"
                />

                {reviewError && (
                  <p className={styles.formError} role="alert">{reviewError}</p>
                )}

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={!selectedRating}
                >
                  {submitState === "posted"
                    ? "Posted —"
                    : reviewText.trim()
                      ? "Post Review →"
                      : "Capture Rating →"}
                </button>
              </form>
            </Reveal>

          </div>
        </section>

        {/* ── Price ── */}
        <section className={styles.priceSection} aria-label="Where to buy">
          <Reveal>
            <div className={styles.priceInner}>
              <h2 className={styles.priceTitle}>Where to Buy</h2>
              <div className={styles.priceRule} aria-hidden="true" />
              <div className={styles.priceGrid}>
                {prices.map((p) => (
                  <div key={p.shop} className={styles.priceShop}>
                    <span className={styles.shopName}>{p.shop}</span>
                    {p.available ? (
                      <div className={styles.shopPriceRow}>
                        <a
                          href={p.url || "#"}
                          className={styles.shopPrice}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Buy on ${p.shop} for $${p.price.toFixed(2)}`}
                        >
                          ${p.price.toFixed(2)}
                        </a>
                        {p.cut > 0 && (
                          <span className={styles.shopDeal} aria-label={`${p.cut}% off`}>
                            −{p.cut}%
                          </span>
                        )}
                        {p.cut > 0 && (
                          <span className={styles.shopOriginal}>
                            ${p.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className={styles.shopUnavailable} aria-label="Not available">
                        Not available
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

      </main>

      <LibraryToast action={toast} onDismiss={() => setToast(null)} />
    </div>
    </RequireAuth>
  );
}
