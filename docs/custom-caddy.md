# Кастомное решение: GitHub Actions + Caddy v2.9

> Аналог решения с Traefik, но с Caddy как reverse proxy. HTTP/3 по умолчанию, упрощённый SSL для двухуровневых wildcard.

---

## Почему Caddy, а не Traefik?

| Аспект | Traefik v3 | Caddy v2.9 |
|--------|-----------|------------|
| HTTP/3 | Нужно включить явно | **Включён по умолчанию** |
| Двухуровневый wildcard | DNS-01 через Cloudflare API | **on_demand_tls — без DNS API** |
| WebTransport | Экспериментально | Более зрелая поддержка |
| Конфигурация | Docker labels | Caddyfile / JSON API |
| Docker auto-discovery | Через labels автоматически | Через API или Caddyfile вручную |
| Простота конфига | Средняя | Ниже |
| Экосистема Docker | Отличная | Хорошая |
| ZeroSSL (альтернатива LE) | Вручную | Встроенная поддержка |

---

## Архитектура

```
GitHub (push to main)
    │
    ▼
GitHub Actions (self-hosted runner на VPS)
    │  git pull
    │  docker compose up -d --build
    │  curl -X POST http://caddy:2019/... ← добавить route в Caddy
    ▼
Docker containers (tictactoe-petrov-*)
    ▼
Caddy v2.9 (слушает порты 80/443/443 UDP)
    │  on_demand_tls: cert выдаётся при первом запросе
    │  HTTP/3 включён автоматически
    ▼
HTTPS + WebSocket + HTTP/3 + WebTransport → браузер
```

---

## Компоненты и версии (2026)

| Компонент | Версия | Назначение |
|-----------|--------|-----------|
| Caddy | v2.9.x | Reverse proxy, SSL, HTTP/3 |
| GitHub Actions runner | v2.x | CI/CD |
| Docker Compose | v2.x | Оркестрация |
| cAdvisor | v0.50+ | Метрики |
| Prometheus | v3.x | Time-series |
| Grafana | v11.x | Dashboards |
| Dozzle | v8.x | Логи для студентов |
| Adminer | v4.x | DB browser |

---

## Caddy — ключевые возможности

### on_demand_tls — главная фича для нашего сценария

Caddy может выдавать TLS-сертификат **для любого домена при первом HTTPS-запросе** к нему, без предварительной настройки.

**Как это решает проблему двухуровневого wildcard:**

Вместо того чтобы получать wildcard-сертификат `*.*.tlfstudents.com` (что технически невозможно в стандартном X.509) или per-student wildcard через DNS-01, Caddy просто выдаёт cert для `tictactoe.petrov.tlfstudents.com` при первом обращении.

```
Браузер → GET https://tictactoe.petrov.tlfstudents.com
Caddy → "Этот домен мне не известен. Проверю у approval endpoint..."
Caddy → GET http://localhost:8088/check?domain=tictactoe.petrov.tlfstudents.com
Approval service → 200 OK (домен есть в базе задеплоенных проектов)
Caddy → запрос cert у Let's Encrypt (HTTP-01 challenge)
Caddy → cert получен, продолжает HTTPS соединение
```

**Не нужен Cloudflare API!** Caddy использует обычный HTTP-01 challenge.

### Admin API — динамическая конфигурация

Caddy имеет REST API на порту 2019 для добавления/удаления routes без перезапуска:

```bash
# Добавить route для нового проекта:
curl -X POST http://localhost:2019/config/apps/http/servers/srv0/routes \
  -H "Content-Type: application/json" \
  -d @route.json
```

---

## Caddy — конфигурация

### Caddyfile (начальная конфигурация)

```caddyfile
{
    # Глобальные настройки
    admin 0.0.0.0:2019

    on_demand_tls {
        ask http://localhost:8088/check-domain
        interval 2m
        burst 5
    }

    # Prometheus metrics
    servers {
        metrics
    }
}

# Wildcard — обрабатывает все студенческие проекты
*.*.tlfstudents.com {
    tls {
        on_demand
    }

    reverse_proxy {
        # Динамически определяем upstream через шаблон или lookup
        # (реализуется через custom plugin или approval service)
        to {$UPSTREAM_HOST}
    }
}

# Grafana dashboard
grafana.tlfstudents.com {
    reverse_proxy grafana:3000
}

# Caddy admin (закрыть от публики!)
tlfstudents.com {
    respond "TLF Students Platform" 200
}
```

### Альтернатива: JSON API конфигурация

Для динамического управления лучше использовать Caddy JSON API напрямую.

**Структура route для одного проекта:**

```json
{
  "match": [
    {
      "host": ["tictactoe.petrov.tlfstudents.com"]
    }
  ],
  "handle": [
    {
      "handler": "reverse_proxy",
      "upstreams": [
        {"dial": "tictactoe-petrov-frontend:8080"}
      ],
      "headers": {
        "request": {
          "set": {
            "X-Real-IP": ["{http.request.remote.host}"]
          }
        }
      }
    }
  ],
  "terminal": true
}
```

---

## Approval Service для on_demand_tls

Небольшой микросервис (Python, ~30 строк), который Caddy спрашивает перед выдачей cert:

```python
# approval_service.py
from aiohttp import web
import json, os

# Загружается из файла, который обновляется deploy-скриптом
def load_known_domains():
    try:
        with open("/data/known_domains.json") as f:
            return set(json.load(f))
    except FileNotFoundError:
        return set()

async def check_domain(request):
    domain = request.query.get("domain", "")
    known = load_known_domains()

    # Разрешаем только домены из *.*.tlfstudents.com
    if domain.endswith(".tlfstudents.com") and domain in known:
        return web.Response(status=200)

    return web.Response(status=403)

app = web.Application()
app.router.add_get("/check-domain", check_domain)

if __name__ == "__main__":
    web.run_app(app, host="0.0.0.0", port=8088)
```

Deploy-скрипт при каждом деплое добавляет новый домен в `known_domains.json`.

---

## WebSocket — настройка

Caddy поддерживает WebSocket автоматически через `reverse_proxy`. Upgrade-заголовки проксируются прозрачно.

**Явная конфигурация WebSocket (если нужно):**

```json
{
  "handler": "reverse_proxy",
  "upstreams": [{"dial": "backend:8081"}],
  "transport": {
    "protocol": "http",
    "versions": ["1.1", "2", "3"]
  }
}
```

Для `templatePWA` aiohttp WebSocket: работает без дополнительной настройки.

---

## HTTP/3 — настройка

**Caddy включает HTTP/3 по умолчанию** при HTTPS. Ничего настраивать не нужно.

Требования:
1. Открыть UDP-порт 443: `ufw allow 443/udp`
2. Caddy автоматически добавляет `Alt-Svc: h3=":443"; ma=2592000` заголовок
3. Браузер (Chrome, Firefox, Edge) автоматически переключается на HTTP/3

**Проверка:**
```bash
curl -I --http3 https://tictactoe.petrov.tlfstudents.com
# HTTP/3 200
```

### WebTransport

Caddy v2.8+ имеет экспериментальную поддержку WebTransport. В Caddy v2.9 — проверять changelog. Это более зрелая реализация, чем у Traefik v3.

---

## Docker Compose для Caddy

```yaml
# /opt/deployments/caddy/docker-compose.yml
services:
  caddy:
    image: caddy:2.9-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"   # QUIC/HTTP/3
      - "2019:2019"     # Admin API (закрыть firewall от публики!)
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
      - /opt/deployments/known_domains.json:/data/known_domains.json
    networks:
      - caddy-public
      - caddy-internal

  approval-service:
    build: ./approval-service
    volumes:
      - /opt/deployments/known_domains.json:/data/known_domains.json:ro
    networks:
      - caddy-internal

networks:
  caddy-public:
    external: true
  caddy-internal:

volumes:
  caddy_data:
  caddy_config:
```

---

## GitHub Actions deploy workflow

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      - name: Deploy containers
        run: |
          STUDENT="petrov"  # из маппинга github_user → student
          PROJECT="${{ github.event.repository.name }}"
          DOMAIN="${PROJECT}.${STUDENT}.tlfstudents.com"
          DEPLOY_DIR="/opt/deployments/students/${STUDENT}/${PROJECT}"

          mkdir -p "$DEPLOY_DIR"
          rsync -a --delete ./ "$DEPLOY_DIR/"
          cd "$DEPLOY_DIR"

          docker compose up -d --build --remove-orphans

      - name: Register domain in Caddy
        run: |
          DOMAIN="${PROJECT}.${STUDENT}.tlfstudents.com"
          FRONTEND_CONTAINER="${PROJECT}-${STUDENT}-frontend-1"

          # Обновить known_domains.json
          python3 /opt/scripts/register_domain.py \
            --domain "$DOMAIN" \
            --upstream "$FRONTEND_CONTAINER:8080"

          # Добавить route в Caddy через Admin API
          curl -s -X POST http://localhost:2019/config/apps/http/servers/srv0/routes \
            -H "Content-Type: application/json" \
            -d "$(python3 /opt/scripts/generate_route.py --domain $DOMAIN --upstream $FRONTEND_CONTAINER:8080)"

          echo "✅ Deployed: https://${DOMAIN}"

      - name: Health check
        run: |
          sleep 15  # Caddy нужно время на получение cert
          curl -sf "https://${DOMAIN}/health" || echo "⚠️ Health check pending (cert может выдаваться)"
```

---

## Сравнение: Caddy vs Traefik (подробно)

### Docker Auto-Discovery

**Traefik:** читает Docker labels автоматически — student добавляет labels в compose, Traefik сам регистрирует роут.

**Caddy:** нет нативного Docker provider — после `docker compose up` нужно вызвать Caddy API. Это делает deploy-скрипт. Студент ничего не добавляет в compose.

**Вывод:** Traefik прозрачнее (всё в compose), Caddy требует скрипт, но зато compose студента остаётся чище.

### SSL Complexity

**Traefik:** DNS-01 через Cloudflare API — нужен токен, зависимость от Cloudflare.

**Caddy:** on_demand_tls + HTTP-01 — Cloudflare не нужен, только открытый 80 порт.

**Вывод:** Caddy значительно проще для wildcard SSL.

### HTTP/3

**Traefik:** нужна явная конфигурация (`http3: {}`), UDP порт 443.

**Caddy:** включён по умолчанию при HTTPS. Просто открыть UDP 443.

**Вывод:** Caddy проще и надёжнее.

---

## Мониторинг (аналогично Traefik-решению)

Caddy экспортирует Prometheus метрики нативно:

```
# Caddy метрики доступны на:
http://caddy:2019/metrics

# Включить в Caddyfile:
{
    servers {
        metrics
    }
}
```

Добавить в `prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'caddy'
    static_configs:
      - targets: ['caddy:2019']
```

Caddy предоставляет: request rate, latency percentiles, TLS handshake time, active connections — всё per-host.

---

## Плюсы

- **HTTP/3 из коробки** — ничего настраивать не нужно
- **on_demand_tls** — no DNS-01, no Cloudflare dependency
- Более зрелая поддержка WebTransport
- Compose-файл студента остаётся чистым (без labels)
- Caddy Admin API — динамическое управление без перезапуска
- Нативные Prometheus-метрики
- Один бинарник, простая конфигурация

## Минусы

- Нет нативного Docker auto-discovery (нужен скрипт)
- Deploy-скрипт обязателен и должен быть надёжным
- Approval service — дополнительный микросервис
- Меньше готовых Docker-гайдов, чем для Traefik
- on_demand_tls имеет rate limits Let's Encrypt — при массовом деплое нужен осторожный подход

---

## Ограничения Let's Encrypt для on_demand_tls

Let's Encrypt rate limits:
- 50 cert/domain/неделю
- 5 failed validations/hostname/час

При 20 студентах × ~3 проекта = 60 доменов. Первый деплой всех проектов за неделю может упереться в лимит.

**Решение:** использовать `ACME_STAGING=true` при тестировании, staging-среду Let's Encrypt без лимитов.

Или: ZeroSSL (встроенный в Caddy, отдельные rate limits).

---

## Шаги установки

1. Провижн VPS (Ubuntu 24.04 LTS), Docker Engine
2. Создать Docker network: `docker network create caddy-public`
3. Настроить DNS: A-запись `*.tlfstudents.com → VPS IP` (у любого DNS-провайдера)
4. Написать approval service (Python, 30 строк)
5. Развернуть Caddy v2.9 с Admin API
6. Написать `register_domain.py` и `generate_route.py` скрипты
7. Зарегистрировать GitHub Actions self-hosted runner для org
8. Создать deploy workflow (см. выше)
9. Развернуть monitoring: cAdvisor + Prometheus + Grafana
10. Развернуть Dozzle + Adminer
11. Тест end-to-end: push → деплой → cert на первый запрос → HTTP/3 проверка
