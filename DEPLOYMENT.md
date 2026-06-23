# Deployment Guide

CheckPoint runs as two separate services: Next.js on Vercel, Flask on Render (or Koyeb/Fly.io). The database is PostgreSQL on Neon. Images are stored on Cloudinary.

---

## Services

| Service | Purpose | Free tier |
|---|---|---|
| [Vercel](https://vercel.com) | Next.js frontend hosting | Always free |
| [Render](https://render.com) | Flask backend hosting | Free (spins down after 15min inactivity) |
| [Koyeb](https://koyeb.com) | Flask backend hosting (no spin-down) | Free alternative to Render |
| [Fly.io](https://fly.io) | Flask backend hosting (no spin-down) | Free alternative to Render |
| [Neon](https://neon.tech) | PostgreSQL database | Free (512MB, pauses after 5min) |
| [Cloudinary](https://cloudinary.com) | Profile image storage | Free (25GB) |
| [Namecheap](https://nc.me) | Custom `.me` domain | Free via GitHub Student Pack |

> **Render spin-down workaround:** use [UptimeRobot](https://uptimerobot.com) (free) to ping your Render URL every 14 minutes.

> **Railway** looks free but requires a $5/month subscription — skip it.

---

## Architecture

```
Browser → Vercel (Next.js) → /api/* → Render/Koyeb (Flask) → Neon (PostgreSQL)
                                                             → Cloudinary (images)
                                                             → IGDB / ITAD / Ollama / Exa
```

Next.js proxies all `/api/*` requests to Flask via `BACKEND_ORIGIN`. Auth cookies stay same-origin — no CORS needed.

---

## Backend changes required before deploy

### 1. Add production dependencies

Append to `backend/requirements.txt`:

```
gunicorn==21.2.0
psycopg2-binary==2.9.9
cloudinary==1.40.0
```

### 2. Create Procfile

Create `backend/Procfile`:

```
web: gunicorn "backend:app" --bind 0.0.0.0:$PORT --workers 2
```

### 3. Fix postgres:// URL prefix

Render gives a `postgres://` connection string but SQLAlchemy 2.x requires `postgresql://`. In `backend/__init__.py`, replace the `SQLALCHEMY_DATABASE_URI` config line with:

```python
_db_url = os.getenv('DATABASE_URL', 'sqlite:///' + os.path.join(instance_dir, 'database.db'))
if _db_url.startswith('postgres://'):
    _db_url = _db_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = _db_url
```

### 4. Disable debug mode

In `backend/__init__.py`, change the bottom of the file:

```python
if __name__ == "__main__":
    app.run(debug=False)
```

### 5. Migrate avatar uploads to Cloudinary

Local `static/uploads/` is wiped on every redeploy. Add Cloudinary to both upload paths:

In `backend/__init__.py` and `backend/api.py`, add at the top:

```python
import cloudinary
import cloudinary.uploader
cloudinary.config(from_url=os.environ.get("CLOUDINARY_URL", ""))
```

Replace `new_photo.save(os.path.join(...))` with:

```python
result = cloudinary.uploader.upload(
    new_photo,
    public_id=uuid.uuid4().hex,
    overwrite=True,
    resource_type="image",
)
current_user.profile_pic = result["secure_url"]
```

Add Cloudinary to `frontend/next.config.ts` image domains:

```typescript
{ protocol: "https", hostname: "res.cloudinary.com" },
```

---

## Frontend changes required before deploy

None — `BACKEND_ORIGIN` is already wired in `next.config.ts`. Just set the environment variable on Vercel.

---

## Security checklist

- [ ] `.env` is in `.gitignore` — verify with `git check-ignore -v backend/.env`
- [ ] No hardcoded secrets in any `.py` file — `grep -rn "SECRET_KEY\s*=\s*['\"]" backend/`
- [ ] `debug=False` in production
- [ ] File upload validates extension against `('.jpg', '.jpeg', '.png', '.gif')`
- [ ] Audit git history for accidental `.env` commits: `git log --all --full-history -- "**/.env"`

---

## Environment variables

### Backend (set in Render/Koyeb dashboard)

| Variable | Value |
|---|---|
| `SECRET_KEY` | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DATABASE_URL` | Neon connection string (see below) |
| `IGDB_CLIENT_ID` | From your Twitch Developer Portal app |
| `IGDB_CLIENT_SECRET` | From your Twitch Developer Portal app |
| `ITAD_API_KEY` | From IsThereAnyDeal |
| `OLLAMA_API_KEY` | From Ollama Cloud |
| `SEARCH_API_KEY` | From Exa |
| `CLOUDINARY_URL` | From Cloudinary dashboard |

### Frontend (set in Vercel dashboard)

| Variable | Value |
|---|---|
| `BACKEND_ORIGIN` | `https://your-app.onrender.com` |

---

## Step-by-step deploy

### 1. Set up Neon (PostgreSQL)

1. Sign up at [neon.tech](https://neon.tech) — free, no credit card
2. Create project: name `game-tracker`, pick nearest region
3. Copy the connection string: `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`
4. This becomes your `DATABASE_URL`

### 2. Set up Cloudinary

1. Sign up at [cloudinary.com](https://cloudinary.com) — free tier
2. Dashboard → Settings → API Keys → copy `CLOUDINARY_URL`
3. Format: `cloudinary://api_key:api_secret@cloud_name`

### 3. Deploy backend to Render

1. [render.com](https://render.com) → New → Web Service
2. Connect GitHub repo
3. Set **Root Directory**: `backend`
4. Set **Build Command**: `pip install -r requirements.txt`
5. Set **Start Command**: `gunicorn "backend:app" --bind 0.0.0.0:$PORT --workers 2`
6. Instance type: Free
7. Add all backend environment variables (see above)
8. Click Deploy — wait ~3 minutes
9. Once live, open the Shell tab and run:
   ```bash
   python -c "from backend import app, db; app.app_context().push(); db.create_all(); print('done')"
   ```
10. Copy your Render URL: `https://your-app.onrender.com`

### 4. Deploy frontend to Vercel

1. [vercel.com](https://vercel.com) → Add New Project
2. Connect GitHub repo
3. Set **Root Directory**: `frontend`
4. Add environment variable: `BACKEND_ORIGIN=https://your-app.onrender.com`
5. Click Deploy — wait ~2 minutes

### 5. (Optional) Custom domain via GitHub Student Pack

1. Claim free `.me` domain at [nc.me](https://nc.me) with your GitHub Student Pack
2. Vercel dashboard → your project → Domains → add your domain
3. Copy the DNS records Vercel gives you
4. Namecheap → Advanced DNS → add those records
5. Wait 5–30 minutes for DNS propagation
6. SSL is automatic — Vercel provisions Let's Encrypt once DNS verifies

### 6. Seed demo data

Run once via Render Shell after deploy:

```bash
python -c "
from backend import app, db, bcrypt
from backend.models import User, UserGames
from backend.igdb_caching import get_create_game
with app.app_context():
    pw = bcrypt.generate_password_hash('demo1234')
    u = User(username='demo', email='demo@example.com', password=pw)
    db.session.add(u)
    db.session.commit()
    for igdb_id in [1942, 119171, 1020]:
        get_create_game(igdb_id)
        db.session.add(UserGames(user_id=u.id, game_id=igdb_id, list_type='played'))
    db.session.commit()
    print('Demo user: demo / demo1234')
"
```

---

## GitHub repo setup

### Publishing from a private team repo

If you cannot fork the private repo, copy it without history:

```bash
# Remove old remote
git remote remove origin

# Strip history to a single clean commit
git checkout --orphan clean-branch
git add .
git commit -m "Initial commit"
git branch -D main
git branch -m main

# Push to your new public repo
git remote add origin https://github.com/yourusername/checkpoint-tracker.git
git push -u origin main --force
```

### .env workflow

Never commit `.env`. Commit `.env.example` with empty values instead:

```bash
# backend/.env.example
IGDB_CLIENT_ID=
IGDB_CLIENT_SECRET=
ITAD_API_KEY=
OLLAMA_API_KEY=
SEARCH_API_KEY=
SECRET_KEY=
DATABASE_URL=
CLOUDINARY_URL=
```

On Render and Vercel, paste values directly into their Environment Variables dashboard. Render has a "Paste from .env" button for bulk input.
