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

- **`/summary`** — generates a digest of the chat using OpenAI's API
  - `/summary` — since the last checkpoint summary (or last 24h if none exist yet). This call
    **moves the checkpoint** forward, so the next plain `/summary` continues from here.
  - `/summary 6h` / `/summary 24h` — a one-off look at a fixed window. These **do not** move the
    checkpoint, so you can check a short recent window without losing track of the longer period
    since the last general summary.
- **Reply-aware context** — when summarizing, the bot reconstructs who replied to whom, so the
  AI has the conversational thread, not just a flat list of messages
- **🚬 Cigarette requests** — a small chance on every message that the bot asks the chat for a
  cigarette, with a first-come-first-served inline button
- **😂 Jokes & memes** — a library of jokes and meme images the bot can drop into the chat
- **😈 Bully mode** — roughly 1 in 100 messages gets roasted with a prepared punchline, picked at
  random
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
│   ├── deploy.yml              # main playbook
│   ├── run.sh                  # convenience wrapper around ansible-playbook
│   └── roles/
│       └── punkduck/
│           └── tasks/
│               ├── main.yml
│               ├── install_docker.yml
│               └── deploy_bot.yml
├── bot/
│   ├── src/
│   │   ├── index.js          # entrypoint, starts Telegraf
│   │   ├── db.js             # PostgreSQL connection & queries
│   │   ├── handlers.js       # message/command handlers
│   │   ├── summarize.js      # OpenAI summary generation
│   │   ├── messages.js       # all user-facing bot text in one place
│   │   ├── cigarette.js      # the cigarette-request feature
│   │   ├── jokes.js          # joke library feature
│   │   ├── media.js          # meme image feature
│   │   └── bully.js          # random roast/punchline feature
│   ├── content/
│   │   └── jokes.json                      # joke text data
│   ├── media/
│   │   └── memes/                          # meme image files
│   ├── migrations/                         # versioned SQL migrations
│   │   ├── 001_init.sql    
│   │   ├── 002_cigarette_event.sql
│   │   └──  003_checkpoint_summaries.sql
│   ├── settings.js                         # centralized env var loading
│   ├── Dockerfile
│   └── package.json
├── terraform/                  # GCP provisioning — work in progress
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
