# Кастомное решение: GitHub Actions + Traefik v3

> Полностью кастомный деплой без PaaS-уровня. GitHub Actions self-hosted runner + Traefik v3 как reverse proxy.

---

## Архитектура

```
GitHub (push to main)
    │
    ▼
GitHub Actions (self-hosted runner на VPS)
    │  git pull
    │  docker compose build
    │  docker compose up -d
    ▼
Docker containers (tictactoe-petrov-backend, tictactoe-petrov-frontend)
    │  labels: traefik.enable=true
    ▼
Traefik v3 (слушает Docker socket, auto-discovers контейнеры)
    │  Let's Encrypt cert для tictactoe.petrov.tlfstudents.com
    ▼
HTTPS + WebSocket + HTTP/3 → браузер студента
```

---

## Компоненты и версии (2026)

| Компонент | Версия | Назначение |
|-----------|--------|-----------|
| GitHub Actions runner | v2.x | CI/CD pipeline |
| Traefik | v3.3.x | Reverse proxy, SSL, HTTP/3 |
| Docker Compose | v2.x (plugin) | Оркестрация контейнеров |
| cAdvisor | v0.50+ | Метрики контейнеров |
| Prometheus | v3.x | Time-series база |
| Grafana | v11.x | Dashboards |
| Dozzle | v8.x | Лог-вьювер для студентов |
| Adminer | v4.x | DB browser |
| Cloudflare | DNS API | DNS-01 challenge для wildcard |

---

## Структура директорий на VPS

```
/opt/deployments/
├── traefik/
│   ├── docker-compose.yml
│   ├── traefik.yml          ← статическая конфигурация
│   └── acme.json            ← сертификаты (chmod 600)
├── monitoring/
│   ├── docker-compose.yml   ← cAdvisor + Prometheus + Grafana
│   └── prometheus.yml
├── tools/
│   └── docker-compose.yml   ← Dozzle + Adminer
└── students/
    ├── petrov/
    │   ├── tictactoe/       ← git clone репозитория
    │   │   ├── docker-compose.yml (студента)
    │   │   └── ...
    │   └── pong/
    └── ivanov/
        └── calculator/
```

---

## Traefik v3 — конфигурация

### Статическая конфигурация (`traefik.yml`)

```yaml
api:
  dashboard: true
  insecure: false

log:
  level: INFO

accessLog: {}

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"
    http3: {}          # HTTP/3 включён в Traefik v3
  web-quic:
    address: ":443/udp"  # UDP для QUIC/HTTP/3

certificatesResolvers:
  cloudflare:
    acme:
      email: admin@tlfstudents.com
      storage: /acme/acme.json
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"

providers:
  docker:
    exposedByDefault: false
    network: traefik-public
  file:
    directory: /etc/traefik/dynamic
    watch: true
```

### Docker Compose для Traefik

```yaml
services:
  traefik:
    image: traefik:v3.3
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"   # QUIC
    environment:
      CF_API_TOKEN: ${CLOUDFLARE_API_TOKEN}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml:ro
      - traefik_acme:/acme
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.tlfstudents.com`)"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=${TRAEFIK_DASHBOARD_AUTH}"

networks:
  traefik-public:
    external: true

volumes:
  traefik_acme:
```

---

## Traefik labels в docker-compose студента

Студент (или шаблон) добавляет в `docker-compose.yml`:

```yaml
services:
  frontend:
    # ... build и прочее без изменений ...
    networks:
      - default
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tictactoe-petrov.rule=Host(`tictactoe.petrov.tlfstudents.com`)"
      - "traefik.http.routers.tictactoe-petrov.entrypoints=websecure"
      - "traefik.http.routers.tictactoe-petrov.tls.certresolver=cloudflare"
      - "traefik.http.services.tictactoe-petrov.loadbalancer.server.port=8080"
      # Resource limits:
      - "traefik.http.middlewares.limit-tictactoe.ratelimit.average=100"

  backend:
    # ... без изменений ...
    networks:
      - default
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tictactoe-petrov-api.rule=Host(`tictactoe.petrov.tlfstudents.com`) && PathPrefix(`/api`)"
      - "traefik.http.routers.tictactoe-petrov-api.entrypoints=websecure"
      - "traefik.http.routers.tictactoe-petrov-api.tls.certresolver=cloudflare"
      - "traefik.http.services.tictactoe-petrov-api.loadbalancer.server.port=8081"
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

networks:
  traefik-public:
    external: true
```

---

## WebSocket — настройка

**В Traefik v3 WebSocket работает автоматически** — никаких дополнительных labels или конфигурации не требуется. Traefik автоматически обрабатывает upgrade headers.

Для `templatePWA` aiohttp WebSocketHub: клиент подключается к `wss://tictactoe.petrov.tlfstudents.com/ws/...` → Traefik проксирует на backend:8081 без изменений.

**Проверка в nginx.conf фронтенда:**
```nginx
# Если фронтенд проксирует WebSocket запросы к бэкенду внутри Docker-сети:
location /ws/ {
    proxy_pass http://backend:8081;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

---

## HTTP/3 — настройка и проверка

**Traefik v3 (GA с v3.0, стабилен в v3.3):**

1. Открыть UDP-порт 443 на VPS:
   ```bash
   ufw allow 443/udp
   ```

2. В `traefik.yml` уже добавлено `http3: {}` (см. выше)

3. Traefik автоматически добавляет `Alt-Svc` заголовок, браузер переключается на HTTP/3

4. Проверка:
   ```bash
   curl -I --http3 https://tictactoe.petrov.tlfstudents.com
   ```

**WebTransport в Traefik v3.3:** экспериментальная поддержка — проверять release notes.

---

## SSL / Wildcard сертификаты

### Проблема двухуровневого wildcard

DNS wildcard `*.tlfstudents.com` → VPS IP — покрывает `petrov.tlfstudents.com`, но НЕ `tictactoe.petrov.tlfstudents.com`.

### Решение 1: Wildcard через Cloudflare (рекомендуется)

1. Домен делегировать на Cloudflare NS
2. В Cloudflare: A-запись `*.tlfstudents.com → VPS IP` (с проксированием или без)
3. Traefik использует DNS-01 через Cloudflare API для cert `*.petrov.tlfstudents.com`
4. Но каждый студент требует отдельного wildcard! → Решение: один cert `*.tlfstudents.com` + second-level wildcard через Traefik `certResolver` per-domain

Практический подход:
```yaml
# В labels каждого проекта указывать конкретный домен:
- "traefik.http.routers.myapp.tls.certresolver=cloudflare"
# Traefik запросит cert для tictactoe.petrov.tlfstudents.com индивидуально
# DNS-01 позволяет это без ограничений HTTP-01
```

Это работает, потому что DNS-01 не требует HTTP-доступа — Traefik создаёт TXT-запись через Cloudflare API.

### Решение 2: Упрощённый URL-паттерн

`petrov-tictactoe.tlfstudents.com` вместо `tictactoe.petrov.tlfstudents.com` → один wildcard `*.tlfstudents.com`, HTTP-01 challenge, без Cloudflare API.

---

## GitHub Actions — self-hosted runner

### Установка runner на VPS

```bash
# Зарегистрировать runner для организации:
# GitHub → org Settings → Actions → Runners → New self-hosted runner
mkdir ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-linux-x64.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.x.x/actions-runner-linux-x64-2.x.x.tar.gz
tar xzf ./actions-runner-linux-x64.tar.gz
./config.sh --url https://github.com/YOUR_ORG --token YOUR_TOKEN
./svc.sh install && ./svc.sh start
```

Пользователь runner должен быть в группе `docker`:
```bash
usermod -aG docker runner-user
```

### Reusable workflow в org (`.github/workflows/deploy.yml`)

Файл в репозитории **org** (например `YOUR_ORG/.github`):

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Validate docker-compose
        run: docker compose config --quiet

      - name: Deploy
        run: |
          STUDENT="${{ github.repository_owner }}"  # или из маппинга
          PROJECT="${{ github.event.repository.name }}"
          DEPLOY_DIR="/opt/deployments/students/${STUDENT}/${PROJECT}"

          mkdir -p "$DEPLOY_DIR"
          cd "$DEPLOY_DIR"

          # Копируем или обновляем код
          if [ -d .git ]; then
            git pull
          else
            git clone "${{ github.repositoryUrl }}" .
          fi

          # Деплой
          docker compose pull --quiet || true
          docker compose up -d --build --remove-orphans

          echo "✅ Deployed: https://${PROJECT}.${STUDENT}.tlfstudents.com"

      - name: Health check
        run: |
          sleep 10
          curl -sf "https://${PROJECT}.${STUDENT}.tlfstudents.com/health" || \
            echo "⚠️ Health check failed — проверьте логи"
```

---

## Ресурсные лимиты

**Вариант 1: В compose-файле студента (рекомендуется):**
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          memory: 128M
```

**Вариант 2: Admin overlay** — отдельный `docker-compose.override.yml` от администратора:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
```

Docker использует cgroup v2 (Ubuntu 22.04+) для enforcement.

---

## Мониторинг

### Стек: cAdvisor + Prometheus + Grafana

```yaml
# /opt/deployments/monitoring/docker-compose.yml
services:
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.50.0
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    networks:
      - monitoring

  prometheus:
    image: prom/prometheus:v3.0.0
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:11.0.0
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - traefik-public
      - monitoring
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.grafana.rule=Host(`grafana.tlfstudents.com`)"
      - "traefik.http.routers.grafana.entrypoints=websecure"
      - "traefik.http.routers.grafana.tls.certresolver=cloudflare"
```

**Grafana dashboards:**
- Docker контейнеры: [ID 893](https://grafana.com/grafana/dashboards/893) или [ID 19792](https://grafana.com/grafana/dashboards/19792)
- Traefik: [ID 17346](https://grafana.com/grafana/dashboards/17346)

---

## Доступ студентов к логам

**Dozzle** — легковесный Docker log viewer:

```yaml
services:
  dozzle:
    image: amir20/dozzle:v8.x
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      DOZZLE_AUTH_PROVIDER: simple
      DOZZLE_USERNAME: admin
      DOZZLE_PASSWORD: ${DOZZLE_PASSWORD}
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dozzle.rule=Host(`logs.tlfstudents.com`)"
```

Dozzle v8+ поддерживает multi-user: каждому студенту — логин, видит только контейнеры с именем, содержащим имя студента.

---

## Безопасность self-hosted runner

⚠️ **Важно:** GitHub рекомендует использовать self-hosted runners **только с private репозиториями**.

Риски:
- Студент может через PR запустить произвольный код на VPS
- Runner имеет доступ к Docker socket (privilege escalation)

Меры защиты:
1. GitHub org: все репозитории — **private**
2. Runner запускается от отдельного пользователя с ограниченными правами
3. Docker socket доступен только через rootless Docker (опционально)
4. Approval workflow для fork PRs: отключить в настройках org

---

## Плюсы

- **HTTP/3 доступен** (Traefik v3, stable)
- Полный контроль над каждым слоем
- Traefik labels в compose = infrastructure as code в репозитории студента
- Prometheus + Grafana — лучший мониторинг
- Нет abstraction layers — понятно, что происходит
- Wildcard DNS-01 через Cloudflare работает надёжно

## Минусы

- **Самая высокая сложность** (~10–15 часов до production-ready)
- Студент должен добавить Traefik labels в compose — friction
- self-hosted runner: риски безопасности, требует приватных репозиториев
- DNS-01 требует Cloudflare (или другого провайдера с API)
- Нет встроенного UI управления проектами
- Kill switch: только через SSH + `docker compose stop`
- Dozzle/Adminer требуют дополнительной настройки

---

## Шаги установки

1. Провижн VPS (Ubuntu 24.04 LTS), Docker Engine + compose plugin
2. Создать Docker network: `docker network create traefik-public`
3. Настроить Cloudflare: A-запись `*.tlfstudents.com → VPS IP`, получить API token
4. Развернуть Traefik v3 с DNS-01 конфигурацией
5. Зарегистрировать GitHub Actions self-hosted runner для org
6. Создать reusable workflow в `org/.github` репозитории
7. Развернуть monitoring стек (cAdvisor + Prometheus + Grafana)
8. Развернуть Dozzle + Adminer
9. Задокументировать: как студенту добавить Traefik labels в compose
10. Тест end-to-end: push в `tictactoe` → автоматический деплой → `tictactoe.petrov.tlfstudents.com`
