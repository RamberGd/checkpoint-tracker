"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Reveal from "../../components/Reveal";
import Navbar from "../../components/Navbar";
import { api, ApiError, type Discussion } from "../../lib/api";
import styles from "./discussion.module.css";
import RequireAuth from "../../components/RequireAuth";

function toRoman(n: number): string {
  const map: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let result = "";
  for (const [val, sym] of map) {
    while (n >= val) { result += sym; n -= val; }
  }
  return result;
}

type SubmitState = "idle" | "posting" | "posted";

export default function DiscussionPage() {
  const params = useParams();
  const router = useRouter();
  const reviewId = Number(params.id);

  const [data, setData] = useState<Discussion | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  // Load the featured review plus its reply thread.
  useEffect(() => {
    let active = true;
    api
      .discussion(reviewId)
      .then((d) => active && setData(d))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else console.error("Failed to load discussion", err);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [reviewId, router]);

  const canSubmit = replyText.trim().length > 0 && submitState === "idle";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitState("posting");
    try {
      const reply = await api.addReply(reviewId, replyText.trim());
      setData((prev) => (prev ? { ...prev, replies: [...prev.replies, reply] } : prev));
      setReplyText("");
      setSubmitState("posted");
      setTimeout(() => setSubmitState("idle"), 2200);
    } catch (err) {
      console.error("Failed to post reply", err);
      setSubmitState("idle");
    }
  }

  async function deleteReply(id: number) {
    try {
      await api.deleteReply(id);
      setData((prev) =>
        prev ? { ...prev, replies: prev.replies.filter((r) => r.id !== id) } : prev
      );
    } catch (err) {
      console.error("Failed to delete reply", err);
    }
  }

  // Deleting the featured review removes the thread, so return to the game page.
  async function deleteReview() {
    if (!data) return;
    try {
      await api.deleteReview(data.review.id);
      router.push(`/game/${data.review.gameId}`);
    } catch (err) {
      console.error("Failed to delete review", err);
    }
  }

  if (loading || !data) {
    return (
      <div className={styles.page}>
        <Navbar />
        <main className={styles.main}>
          <section className={styles.headerSection}>
            <h1 className={styles.pageTitle}>Discussion</h1>
          </section>
        </main>
      </div>
    );
  }

  const { review, replies } = data;

  return (
    <RequireAuth>
    <div className={styles.page}>

      <Navbar />

      <main className={styles.main}>

        {/* ── Page header ── */}
        <section className={styles.headerSection}>
          <a
            href={`/game/${review.gameId}`}
            className={styles.backLink}
            aria-label={`Back to ${review.gameTitle}`}
          >
            ← {review.gameTitle}
          </a>
          <Reveal>
            <h1 className={styles.pageTitle}>Discussion</h1>
          </Reveal>
        </section>

        {/* ── Featured review ── */}
        <section className={styles.featuredSection} aria-label="Review under discussion">
          <Reveal delay={60}>
            <article className={styles.featuredReview}>
              <div className={styles.featuredMeta}>
                <span className={styles.featuredUsername}>
                  <span className={styles.featuredAt}>@</span>
                  {review.username}
                </span>
                <span className={styles.featuredRating} aria-label={`Rating: ${review.rating} out of 5`}>
                  {toRoman(review.rating)}&thinsp;/&thinsp;{toRoman(5)}
                </span>
              </div>
              <div className={styles.featuredRule} aria-hidden="true" />
              <blockquote className={styles.featuredComment}>
                {review.comment}
              </blockquote>
              {review.isOwn && (
                <button
                  className={styles.deleteBtn}
                  onClick={deleteReview}
                  aria-label="Delete your review"
                >
                  Delete review
                </button>
              )}
            </article>
          </Reveal>
        </section>

        {/* ── Replies ── */}
        <section className={styles.repliesSection} aria-label="Replies">
          <div className={styles.repliesInner}>

            <div className={styles.repliesHeader}>
              <h2 className={styles.repliesTitle}>Replies</h2>
              <span className={styles.repliesCount} aria-label={`${replies.length} replies`}>
                {replies.length}
              </span>
            </div>

            {replies.length === 0 ? (
              <Reveal>
                <p className={styles.emptyState}>No replies yet. Start the conversation.</p>
              </Reveal>
            ) : (
              <div className={styles.repliesList} role="list">
                {replies.map((reply, i) => (
                  <Reveal key={reply.id} delay={i * 70}>
                    <article className={styles.replyItem} role="listitem">
                      <div className={styles.replyLeft}>
                        <span className={styles.replyUsername}>
                          <span className={styles.replyAt}>@</span>
                          {reply.username}
                        </span>
                        {reply.isOwn && (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => deleteReply(reply.id)}
                            aria-label="Delete your reply"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <p className={styles.replyComment}>{reply.comment}</p>
                    </article>
                  </Reveal>
                ))}
              </div>
            )}

            {/* ── Reply form ── */}
            <Reveal delay={80}>
              <form
                className={styles.replyForm}
                onSubmit={handleSubmit}
                aria-label="Leave a reply"
              >
                <h3 className={styles.formLabel}>Leave a Reply</h3>
                <div className={styles.formRule} aria-hidden="true" />
                <textarea
                  className={styles.textarea}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Add to the conversation."
                  rows={4}
                  aria-label="Your reply"
                  disabled={submitState === "posting"}
                />
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={!canSubmit}
                >
                  {submitState === "posted"
                    ? "Reply posted —"
                    : submitState === "posting"
                    ? "Posting…"
                    : "Post Reply →"}
                </button>
              </form>
            </Reveal>

          </div>
        </section>

      </main>
    </div>
    </RequireAuth>
  );
}
