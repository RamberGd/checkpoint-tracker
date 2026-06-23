/**
 * Typed client for the Flask JSON API.
 *
 * Integration model: every call hits a same-origin `/api/...` path, which
 * `next.config.ts` rewrites to the Flask backend (http://localhost:5000/api/...).
 * Because it is same-origin from the browser's perspective, the Flask-Login
 * session cookie flows automatically — no tokens, no CORS. We still pass
 * `credentials: "same-origin"` explicitly to document the dependency on cookies.
 *
 * Error convention (mirrors backend/api.py):
 *   - success: 2xx, JSON body is the payload
 *   - failure: 4xx/5xx, JSON body `{ error: string, fields?: {field: msg} }`
 * Non-2xx responses are turned into a thrown `ApiError` so callers can
 * `try/catch` and surface the backend's own message text in the UI.
 */

export class ApiError extends Error {
  status: number;
  /** Per-field validation messages (e.g. signup username/email), when present. */
  fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "same-origin",
    headers:
      init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json", ...(init?.headers ?? {}) }
        : init?.headers,
    ...init,
  });

  // 204 No Content (e.g. logout/delete) — nothing to parse.
  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON body (shouldn't happen for the API, but be defensive)
  }

  if (!res.ok) {
    const b = (body ?? {}) as { error?: string; fields?: Record<string, string> };
    throw new ApiError(res.status, b.error ?? `Request failed (${res.status})`, b.fields);
  }
  return body as T;
}

// ── Shared DTOs (shape returned by backend/api.py) ───────────────────

export interface Me {
  id: number;
  username: string;
  email: string;
  /** Same-origin path like "/uploads/avatar.png", or null for the default. */
  avatarUrl: string | null;
  counts: { played: number; wishlist: number; reviews: number };
}

export interface GameSummary {
  id: number; // IGDB id — used directly in /game/[id] routes
  title: string;
  cover: string | null;
}

export interface ReviewDTO {
  id: number;
  username: string;
  rating: number;
  comment: string;
  replyCount: number;
  isOwn: boolean;
}

export interface GameDetail {
  id: number;
  title: string;
  summary: string | null;
  cover: string | null;
  genres: string[];
  releaseDate: string | null; // ISO "YYYY-MM-DD" or null
  avgRating: number | null;
  reviews: ReviewDTO[];
  status: { played: boolean; wishlisted: boolean; favourited: boolean };
}

export interface ListStatus {
  played: boolean;
  wishlisted: boolean;
  favourited: boolean;
}

export interface PriceDTO {
  shop: string;
  price: number;
  originalPrice: number;
  cut: number;
  available: boolean;
  url: string;
}

export interface ProfileReview {
  id: number;
  gameId: number;
  gameTitle: string;
  cover: string | null;
  rating: number;
  comment: string;
}

export interface Profile {
  user: Me;
  favourites: GameSummary[];
  wishlist: GameSummary[];
  played: GameSummary[];
  reviews: ProfileReview[];
}

export interface SearchResult {
  id: number;
  title: string;
  year: number | null;
  genre: string | null;
  cover: string | null;
}

export interface Deal {
  id: number;
  title: string;
  store: string;
  discount: number;
  salePrice: number;
  url: string;
}

export interface Discussion {
  review: {
    id: number;
    gameId: number;
    gameTitle: string;
    username: string;
    rating: number;
    comment: string;
    isOwn: boolean;
  };
  replies: Array<{ id: number; username: string; comment: string; isOwn: boolean }>;
}

// ── Auth ─────────────────────────────────────────────────────────────

export const api = {
  /** Session bootstrap. Throws ApiError(401) when logged out. */
  me: () => request<Me>("/me"),

  login: (identifier: string, password: string) =>
    request<Me>("/login", {
      method: "POST",
      body: JSON.stringify({ username_or_email: identifier, password }),
    }),

  signup: (username: string, email: string, password: string, confirm: string) =>
    request<Me>("/signup", {
      method: "POST",
      body: JSON.stringify({ username, email, password, confirm }),
    }),

  logout: () => request<void>("/logout", { method: "POST" }),

  /** Multipart: username (optional) + profile_pic file (optional). */
  updateProfile: (form: FormData) =>
    request<Me>("/profile/edit", { method: "POST", body: form }),

  // ── Profile / lists ────────────────────────────────────────────────
  profile: () => request<Profile>("/profile"),
  list: (kind: "played" | "wishlist" | "favourites") =>
    request<GameSummary[]>(`/lists/${kind}`),

  // ── Games ──────────────────────────────────────────────────────────
  game: (id: number) => request<GameDetail>(`/games/${id}`),
  prices: (id: number) => request<PriceDTO[]>(`/games/${id}/prices`),
  search: (q: string, offset = 0) =>
    request<SearchResult[]>(`/games/search?q=${encodeURIComponent(q)}&offset=${offset}`),

  togglePlayed: (id: number) =>
    request<ListStatus>(`/games/${id}/played`, { method: "POST" }),
  toggleWishlist: (id: number) =>
    request<ListStatus>(`/games/${id}/wishlist`, { method: "POST" }),
  toggleFavourite: (id: number) =>
    request<ListStatus>(`/games/${id}/favorite`, { method: "POST" }),

  // ── Reviews / replies ──────────────────────────────────────────────
  addReview: (gameId: number, rating: number, comment: string) =>
    request<ReviewDTO>(`/games/${gameId}/reviews`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    }),
  deleteReview: (reviewId: number) =>
    request<void>(`/reviews/${reviewId}`, { method: "DELETE" }),

  discussion: (reviewId: number) =>
    request<Discussion>(`/discussion/${reviewId}`),
  addReply: (reviewId: number, comment: string) =>
    request<Discussion["replies"][number]>(`/reviews/${reviewId}/replies`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),
  deleteReply: (replyId: number) =>
    request<void>(`/replies/${replyId}`, { method: "DELETE" }),

  // ── Sales ──────────────────────────────────────────────────────────
  sales: () => request<Deal[]>("/sales"),
};
