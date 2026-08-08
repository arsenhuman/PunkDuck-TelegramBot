# 🦆🤘 PunkDuck

A Telegram bot for the **DiliRock** summer music festival organizing chat. PunkDuck quietly
logs every message in the group and, on command, produces an AI-generated digest of what
happened — key topics, decisions made, and open questions — so nobody has to scroll through
hundreds of messages to catch up.

It also has a personality: every so often it randomly asks the chat for a cigarette, drops a
meme or a joke, or roasts a random message with a prepared punchline. Because organizing a
festival is stressful and a punk duck deserves to have some fun while keeping everyone in the
loop.

## 🔮 Features

| Feature | Command / trigger | Notes |
|---|---|---|
| **AI summary** | `/summary`, `/summary 6h`, `/summary 24h` | Plain `/summary` picks up from the last checkpoint (or last 24h if none exist) and **moves the checkpoint**. `/summary <period>` is a one-off window and does not move it. Reply-aware — the AI sees who replied to whom, not just a flat message list. |
| **Auto-summary** | runs on a schedule, no command needed | Periodically posts a summary on its own — interval configurable (or off) per chat via `/settings`. See [Auto-summary](#-auto-summary) below for how it decides *where* to post. |
| **`/gpt <question>`** | free-form Q&A | A direct line to the underlying AI model, in-character (voice, not content) — not tied to the chat log. |
| **🚬 Cigarette requests** | random, per message | Small chance per message; first-come-first-served inline button. |
| **🍺 Beer requests** | random, per message | Same mechanic as cigarettes, independent chance/toggle. |
| **😈 Bully mode** | random + replies to the bot | Random roast on ~1/100 messages by default, plus an in-character AI reply whenever someone replies directly to the bot. Uses a separate, stronger AI model than the rest of the bot (see [`OPENAI_MODEL_BULLY`](#-2-fill-in-env-variables)) — sharper delivery is worth the extra cost here specifically. |
| **`/roast`** | reply to a message, or `/roast <text>` | On-demand AI roast of a specific message. |
| **😂 `/joke`** | command | Random joke from a local library. |
| **🖼 `/someshit`** | command | Random meme image for this chat. Falls back to a shared local folder if the chat hasn't uploaded any of its own yet. |
| **`/loadsomeshit`** | admin, reply to (or attach) a photo | Adds a photo to this chat's own meme pool, stored via Telegram's `file_id` (no re-uploading/re-hosting). |
| **❓ FAQ** | @-mention the bot | Answers attendee questions from a per-chat FAQ document (`/setfaq` to upload/replace it, admin-only). |
| **`/settings`** | admin only | In-chat menu: language, personality intensity, per-feature on/off, and event frequency. |
| **`/help`** | anyone | Lists only the commands actually enabled for this chat — driven by the same feature flags as `/settings`. |
- **🐳 Fully containerized** with **Docker Compose** (bot + PostgreSQL)
- **🧱 SQL migrations** tracked and applied explicitly, no auto-magic on startup
- **🚀 One-command deployment via Ansible** to any server you already have (VPS or otherwise) —
  just SSH access and an IP

## 💻 Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js + [Telegraf](https://telegraf.js.org/) (long polling, no webhook/public IP needed) |
| Database | PostgreSQL |
| AI | OpenAI API |
| Containerization | Docker / Docker Compose |
| Deployment | Ansible (any server with SSH) |
| Infra-as-code | Terraform for GCP — **in progress** |

## 🗂️ Project structure

```
punkduck/
├── ansible/
│   ├── ansible.cfg
│   ├── deploy.yml
│   ├── run.sh
│   └── roles/punkduck/tasks/
│       ├── main.yml
│       ├── install_docker.yml
│       └── deploy_bot.yml          # also copies your local .env to the server
├── bot/
│   ├── content/jokes.json
│   ├── media/memes/                # fallback meme pool, shared across chats
│   ├── migrations/                 # versioned SQL, applied explicitly (no auto-magic)
│   │   ├── 001_init.sql
│   │   ├── 002_cigarette_event.sql
│   │   ├── 003_checkpoint_summaries.sql
│   │   ├── 004_chat_settings.sql          # edition/plan/language/features per chat
│   │   ├── 005_settings_extensions.sql    # intensity, chat_media table
│   │   ├── 006_faq_documents.sql
│   │   ├── 007_fix_intensity_column.sql
│   │   ├── 008_auto_summary.sql           # auto_summary_thread_id / last_run_at
│   │   └── 009_beer_event.sql
│   ├── src/
│   │   ├── index.js                       # entrypoint; starts Telegraf + the auto-summary scheduler
│   │   ├── handlers.js                    # message/command routing
│   │   ├── commandFeatureRegistry.js      # simple on/off slash commands (joke, someshit, roast, gpt)
│   │   ├── core/
│   │   │   ├── db.js                      # PostgreSQL connection & queries
│   │   │   ├── editionPresets.js          # per-edition feature/limit defaults — source of truth
│   │   │   ├── resolveTenant.js           # preset + per-chat overrides -> resolved config, cached
│   │   │   ├── tenantSettings.js          # thin data-access layer over chat_settings
│   │   │   ├── featureGate.js             # "is feature X on for this chat" / usage limits
│   │   │   └── i18n.js                    # t() / getPrompt() — locale + intensity resolution
│   │   ├── features/
│   │   │   ├── summary.js                 # AI digest generation
│   │   │   ├── autoSummaryScheduler.js     # periodic in-process scheduler
│   │   │   ├── gpt.js                     # /gpt free-form Q&A
│   │   │   ├── bully.js                   # random roast, reply-to-bot, /roast
│   │   │   ├── cigarette.js               # cigarette-request feature
│   │   │   ├── beer.js                    # beer-request feature (same mechanic as cigarette)
│   │   │   ├── jokes.js                   # joke library
│   │   │   ├── memes.js                   # /someshit + /loadsomeshit
│   │   │   ├── faq.js                     # /setfaq + @-mention Q&A
│   │   │   ├── menu.js                    # /settings inline-keyboard menu
│   │   │   └── help.js                    # /help, built from enabled features
│   │   ├── i18n/locales/
│   │   │   ├── dilirock/{en,ru}.json
│   │   │   ├── general/{en,ru}.json
│   │   │   └── saas/{en,ru}.json
│   │   └── utils/adminCheck.js            # isChatAdmin — Telegram admin OR bot owner
│   ├── settings.js                        # centralized env var loading
│   ├── Dockerfile
│   └── package.json
├── terraform/                              # GCP provisioning — work in progress
├── docker-compose.yaml
└── .env.example
```


## 🚦 Getting started

### 🤖 0. Create the bot on Telegram (one-time)

1. Open [@BotFather](https://t.me/BotFather), send `/newbot`, follow the prompts. Save the
   token — that's your `BOT_TOKEN`.
2. **Important:** send BotFather `/setprivacy`, select your bot, then **Disable**.

   By default, Telegram bots in groups only see messages that are commands or that explicitly
   mention the bot — regular chat messages stay invisible to it. Without disabling this, the
   bot will never see the conversation it's supposed to be summarizing. This is the most common
   reason a freshly deployed bot looks like it "isn't saving anything."

3. Add the bot to the target group as a regular member.

### 🔐 1. Configure environment variables

```bash
cp .env.example .env
```

Fill in:

```env
# --- BOT ---
BOT_TOKEN=your_botfather_token
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini

PGUSER=punkduck
PGPASSWORD=choose_a_secure_password
PGDATABASE=dilirockarchive


# --- Ansible ---
SERVER_IP=your_server_ip
SERVER_USER=ubuntu
SSH_KEY_PATH=~/.ssh/id_rsa

```

> Don't wrap values in quotes — `BOT_TOKEN=abc123`, not `BOT_TOKEN="abc123"`. Also don't add
> spaces around `=`.

You now have two ways to run PunkDuck: a **one-command Ansible deploy** to a server you already
have, or a **manual Docker Compose** setup if you'd rather run it yourself.

---

### 🚀 Option A — Deploy with Ansible (recommended)

If you have a server (any VPS or VM) with an IP address and SSH access, Ansible handles
everything: installing Docker, pulling the code, and bringing the stack up.

1. Add your server details to `.env`:

   ```env
   SERVER_IP=your.server.ip
   SSH_KEY_PATH=~/.ssh/your_private_key
   ```

2. Run the deploy:

   ```bash
   bash ansible/run.sh
   ```

   This installs Docker on the target server (if not already present), clones/updates the repo,
   builds the images, runs migrations, and starts the bot.

3. For subsequent updates, without re-running the full setup:

   ```bash
   bash ansible/run.sh --tags deploy
   ```

   This pulls the latest code and restarts the bot, skipping the Docker installation step.

---

### 🐳 Option B — Manual Docker Compose

If you'd rather run things by hand (or you're developing locally):

```bash
git clone <this repo>
cd punkduck
cp .env.example .env   # fill in as above
```

**Build the images:**
```bash
docker compose build
```

**Start PostgreSQL and wait for it to be healthy:**
```bash
docker compose up -d postgres
docker compose ps   # wait for STATUS to show (healthy)
```

**Apply database migrations** (not automatic — this is intentional, so you always know exactly
when the schema changes):
```bash
docker compose run --rm migrate
```

**Start the bot:**
```bash
docker compose up -d bot
docker compose logs -f bot
```

You should see the bot report it's running. Send `/start` to it in Telegram to confirm.

---

## 🔄 Updating a running deployment

**Via Ansible:**
```bash
bash ansible/run.sh --tags deploy
```

**Via Docker Compose:**
```bash
git pull
docker compose build bot
docker compose run --rm migrate   # only if new migration files were added
docker compose up -d bot
```

## 🗄️ Database backups

Postgres data lives in a Docker named volume, which survives container restarts but not a lost
disk. A manual dump:

```bash
docker compose exec postgres pg_dump -U $PGUSER $PGDATABASE > backup_$(date +%F).sql
```

Automating this (e.g. via cron + upload to a cloud bucket) is on the roadmap.

## 🛣️ Roadmap

- [ ] Terraform module to provision a GCP VM end-to-end (in progress)
- [ ] Secret management beyond plain `.env` files
- [ ] More bot personality features

## 📄 License

MIT
