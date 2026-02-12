ssh -i /Users/dtagachar/Workspace/PetProjects/chronos/chronos-vm-ssh-key-0/chronos-vm-ssh-key-0 dtagachar@178.154.195.23


docker-compose down && docker-compose up -d


scp -i /Users/dtagachar/Workspace/PetProjects/chronos/chronos-vm-ssh-key-0/chronos-vm-ssh-key-0 \
  certificate.key \
  dtagachar@51.250.110.29:~/ssl-certs/


docker compose ps
docker compose logs nginx-proxy

# После правок фронта — пересобрать и поднять только фронт (чтобы подхватить /api и redirect_uri):
docker compose build chronos-frontend --no-cache && docker compose up -d chronos-frontend

# Если браузер всё ещё пишет "Not secure" / "allowed content with certificate errors":
# Сбросить исключение для сайта: в браузере — иконка замка/Not secure → Настройки сайта →
# убрать сайт из разрешённых для "Небезопасное содержимое" (Insecure content).
# Или открыть сайт в режиме инкогнито и проверить.