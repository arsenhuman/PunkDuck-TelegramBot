# DiliPunk - TelegramBot

dilirock-bot/ \n
├── bot/                    # bot code
│   ├── src/
│   │   ├── index.js        # entrypoint. start Telegraf
│   │   ├── db.js           # psql connection. requests
│   │   ├── summarize.js    # API calls (OpenAI)
│   │   └── handlers.js     # handlers
│   ├── migrations/         # SQL - migrations for db
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── terraform/
│   ├── main.tf              # provider, VM, firewall, service account
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
├── docker-compose.yml
├── .gitignore
└── README.md
