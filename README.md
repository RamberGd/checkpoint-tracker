# Project Title
// IMAGE OF THE REAL FRONTEND
## Brief description of the project
CheckPoint 
## Frontend mockup
*In progress*
## Team members
Challa Chandrahas

Beatricie Tanurcov

Maksim Ter-Avakian

Viktor Mihajlovksi Maslovarik

## Installation details
1. Clone the repository in an empty directory
2. Set up a virtual environment and install all required libraries listed in requirements.txt
3. Make a new file titled .env inside the backend directory and make sure that it has the following contents:

    IGDB_CLIENT_ID=""

    IGDB_CLIENT_SECRET=""

    OLLAMA_API_KEY=""

    SEARCH_API_KEY=""

    SECRET_KEY=""

    ITAD_API_KEY=""
4. Go to https://docs.ollama.com/cloud, generate an api key according to their instructions and place it in the quotation marks at OLLAMA_API_KEY
5. Go to https://exa.ai/, generate an api key according to their instructions and place it in the quotation marks at SEARCH_API_KEY
6. Generate you own sectret key for the database via any means and place it in the quotation marks at SECRET_KEY
7. Go to https://isthereanydeal.com/apps/, generate an api key according to their instructions and place it in the quotation marks at ITAD_API_KEY
8. Sign Up with [Twitch](https://dev.twitch.tv/console) for a free account
9. Ensure you have Two Factor Authentication [enabled](https://www.twitch.tv/settings/security)
10. Register your application in the [Twitch Developer Portal](https://dev.twitch.tv/console/apps/create)
11. The OAuth Redirect URL field is not used by IGDB. Please add ’localhost’ to continue.
12. The Client Type must be set to Confidential to generate Client Secrets
13. [Manage](https://dev.twitch.tv/console/apps) your newly created application
14. Generate a Client Secret by pressing \[New Secret\]
15. Take note of the Client ID and Client Secret. Place them in their appropriate positions in the .env file

Installation is complete

## Running the frontend

**Requirements:** Node.js 18+

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).


## Running the backend

Complete the installation steps above first, then:

```bash
cd backend
flask --app __init__.py run --debug
```


## Architecture
```
group-24/
├── backend/
│   ├── __init__.py           # App factory, all route definitions
│   ├── models.py             # SQLAlchemy ORM models (User, Game, Review, ReplyToReview, UserGames)
│   ├── extensions.py         # Shared Flask extension instances (db, login_manager)
│   ├── auth.py               # WTForms login and signup form definitions
│   ├── igdb.py               # IGDB API client (Twitch OAuth + game fetch)
│   ├── igdb_caching.py       # IGDB cache layer — fetches from API, stores in DB
│   ├── deals.py              # IsThereAnyDeal API integration
│   ├── chatbot.py            # LLM streaming via Ollama (SSE)
│   ├── comparison.py         # Price comparison utilities
│   ├── game.py               # Game-related helpers
│   ├── db_creator.py         # One-off script to initialise the database
│   ├── templates/            # Jinja2 server-rendered HTML templates
│   │   ├── base.html         # Shared layout with navbar
│   │   ├── home.html
│   │   ├── login.html / signup.html
│   │   ├── dashboard.html
│   │   ├── profile.html / edit_profile.html
│   │   ├── game.html / discussion.html
│   │   ├── sales.html / chat.html
│   │   └── wishlist.html / played.html / favorites.html
│   ├── static/
│   │   ├── images/           # Static assets (e.g. fallback avatar)
│   │   └── uploads/          # User-uploaded profile pictures
│   ├── instance/             # SQLite database file (git-ignored)
│   └── tests/
│       ├── conftest.py       # Shared fixtures (client, test_user, mocks)
│       ├── test_db.py        # Model constraint tests
│       ├── test_profile.py   # Profile and edit profile route tests
│       ├── test_delete_review.py  # Review and reply deletion tests
│       ├── test_igdb_api.py  # IGDB client unit tests
│       ├── test_game.py      # Game page tests
│       ├── test_searchbar.py # Search functionality tests
│       ├── test_auth.py      # Auth route tests
│       ├── test_deals.py     # Deals/sales tests
│       ├── test_chatbot.py   # Chatbot tests
│       └── test_comparison.py
├── frontend/                 # Frontend assets (in progress)
├── requirements.txt          # Python dependencies
└── README.md
```
