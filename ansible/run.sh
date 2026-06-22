# ansible/run.sh
#!/bin/bash
set -a
source .env
set +a

ansible-playbook ansible/deploy.yml \
  -i "${SERVER_IP}," \
  -u "${SERVER_USER}" \
  --private-key "${SSH_KEY_PATH}" \
  "$@"