# CheckPoint

> A game tracking platform - discover games, manage your library, track prices, and chat with an AI assistant.

<!-- Add a screenshot or demo GIF here once deployed -->
<!-- ![CheckPoint screenshot](docs/screenshot.png) -->

**[Live Demo](https://www.checkpointgames.tech/login)** · **[Report a Bug](../../issues)**

---

## Features

- **Library management** - track games as played, wishlisted, or favourited
- **Game discovery** - search 200,000+ games via the IGDB database with fuzzy matching and infinite scroll
- **Price tracking** - live prices from Steam, GOG, and Epic Games via IsThereAnyDeal
- **Reviews & discussion** - rate and review games, reply to other users in threaded discussions
- **AI chat** - real-time streaming chat assistant with live web search context, powered by Ollama
- **User profiles** - customisable profile with avatar upload

---

## Tech Stack

**Frontend**
- [Next.js 15](https://nextjs.org) (App Router, TypeScript)
- CSS Modules

**Backend**
- [Flask](https://flask.palletsprojects.com) - REST API + session auth
- [SQLAlchemy](https://www.sqlalchemy.org) 
- [Flask-Login](https://flask-login.readthedocs.io) + [Flask-Bcrypt](https://flask-bcrypt.readthedocs.io) - authentication
- [pytest](https://pytest.org) - backend test suite

**External APIs**
- [IGDB](https://www.igdb.com/api) - game data (via Twitch OAuth)
- [IsThereAnyDeal](https://isthereanydeal.com/api) - price comparison
- [Ollama Cloud](https://ollama.com) - AI chat (streaming SSE)
- [Exa](https://exa.ai) - real-time web search for the AI assistant

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+

### 1. Clone the repo

```bash
git clone https://github.com/RamberGd/checkpoint-tracker.git
cd checkpoint-tracker
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```bash
cp .env.example .env
```

Fill in each value - see [API Keys](#api-keys) below.

Run the backend:

```bash
flask --app __init__.py run --debug
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## API Keys

| Variable | Where to get it |
|---|---|
| `IGDB_CLIENT_ID` | [Twitch Developer Portal](https://dev.twitch.tv/console) - register an app, set OAuth redirect to `localhost` |
| `IGDB_CLIENT_SECRET` | Same app in Twitch portal - generate a Client Secret |
| `ITAD_API_KEY` | [IsThereAnyDeal](https://isthereanydeal.com/apps/) - register for a free API key |
| `OLLAMA_API_KEY` | [Ollama Cloud](https://ollama.com/cloud) - generate an API key |
| `SEARCH_API_KEY` | [Exa](https://exa.ai) - sign up for a free API key |
| `SECRET_KEY` | Generate locally: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DATABASE_URL` | Leave blank for SQLite (default). Set to a PostgreSQL connection string for production. |
| `CLOUDINARY_URL` | [Cloudinary](https://cloudinary.com) - free account, copy the URL from your dashboard |

---

## Project Structure

```
checkpoint-tracker/
├── backend/
│   ├── __init__.py           # Flask app, all HTML routes
│   ├── api.py                # JSON API blueprint consumed by the Next.js frontend
│   ├── models.py             # SQLAlchemy models (User, Game, Review, UserGames)
│   ├── extensions.py         # Shared Flask extensions (db, login_manager)
│   ├── auth.py               # WTForms login/signup definitions
│   ├── igdb.py               # IGDB API client (Twitch OAuth + search)
│   ├── igdb_caching.py       # IGDB cache layer - fetches from API, stores in DB
│   ├── deals.py              # IsThereAnyDeal integration
│   ├── chatbot.py            # Ollama streaming + Exa web search
│   ├── .env.example          # Environment variable template
│   ├── requirements.txt      # Python dependencies
│   └── tests/                # pytest test suite (11 modules)
└── frontend/
    ├── app/                  # Next.js App Router pages
    │   ├── page.tsx          # Landing page
    │   ├── profile/          # User profile
    │   ├── game/[id]/        # Game detail + reviews
    │   ├── ai-chat/          # AI assistant
    │   ├── sales/            # Price tracking
    │   └── ...
    ├── app/components/       # Shared UI components
    └── next.config.ts        # Same-origin proxy to Flask backend
```

---

## Architecture

The frontend and backend run as separate services. Next.js proxies all `/api/*` requests to Flask at `BACKEND_ORIGIN`, keeping auth cookies same-origin so no CORS configuration is needed.

```
Browser → Vercel (Next.js) → /api/* → Render (Flask) → Neon (PostgreSQL)
                                                       → IGDB / ITAD / Ollama
```

---

## Running Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

---

## Contributors

This project was built as part of a university course.

| Name               | Contribution                                                                                                           |
|--------------------|------------------------------------------------------------------------------------------------------------------------|
| **M. Ter-Avakian** | Frontend, design system, IGDB game data fetching and caching, SQLAlchemy models, profile management, tests             |
| **B. Tanurcov**             | User authentication, game lists (played/wishlist/favourites), reviews and replies, SQLAlchemy models, tests            |
| **V. M.**             | IDGB API search, chatbot via Ollama API with search integration via Exa API, tests                                     |
| **C. Chandrahas**             | Sales page with deals sourced from ITAD API, ITAD price fetching, game title matching between IGDB and ITAD, tests |

---

## License

<!-- Add if applicable: MIT / Apache 2.0 / or remove this section -->
