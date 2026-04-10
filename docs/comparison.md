# Сравнение платформ и итоговая рекомендация

---

## Сравнительная таблица

### GitHub-интеграция

| Критерий | Coolify | Dokploy | CapRover | Portainer CE | +Traefik | +Caddy |
|---------|---------|---------|----------|-------------|----------|--------|
| Нативный GitHub App | ✅ | ✅ | ❌ | ❌ | через runner | через runner |
| Org-репозитории | ✅ | ✅ | ⚠️ ручная | ❌ | ✅ (org runner) | ✅ (org runner) |
| Push-to-deploy (без конфига студента) | ✅ | ✅ | ⚠️ | ❌ | ⚠️ нужен workflow | ⚠️ нужен workflow |
| Self-hosted runner | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Build-логи в UI | ✅ | ✅ | ✅ | ❌ | GitHub UI | GitHub UI |

### Docker и деплой

| Критерий | Coolify | Dokploy | CapRover | Portainer CE | +Traefik | +Caddy |
|---------|---------|---------|----------|-------------|----------|--------|
| docker-compose нативно | ✅ | ✅ | ⚠️ нужен captain-definition | ✅ (Stacks) | ✅ | ✅ |
| Compose без изменений | ✅ | ✅ | ❌ | ✅ | ⚠️ + labels | ✅ |
| Multi-service (frontend+backend) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Named volumes (SQLite) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Env-injection | UI | UI | UI | UI | GitHub Secrets | GitHub Secrets |
| Rollback | ✅ | ✅ | ⚠️ | ✅ | ручной | ручной |

### Маршрутизация и SSL

| Критерий | Coolify | Dokploy | CapRover | Portainer CE | +Traefik | +Caddy |
|---------|---------|---------|----------|-------------|----------|--------|
| Reverse proxy | Traefik v2 | Traefik | nginx | отдельно | Traefik v3 | Caddy v2.9 |
| SSL (HTTP-01) | ✅ | ✅ | ✅ | зависит от proxy | ✅ | ✅ |
| Wildcard SSL (DNS-01) | ✅ Cloudflare | ✅ | ⚠️ | зависит от proxy | ✅ Cloudflare | ✅ on_demand |
| Двухуровневый wildcard | ⚠️ CF API | ⚠️ CF API | ⚠️ | ✅ (с Caddy) | ⚠️ CF API | ✅ on_demand_tls |
| Кастомный домен per-project | ✅ | ✅ | ✅ | ручной | ✅ | ✅ |
| Авторенование сертификатов | ✅ | ✅ | ✅ | зависит | ✅ | ✅ |

### Протоколы

| Критерий | Coolify | Dokploy | CapRover | Portainer CE | +Traefik | +Caddy |
|---------|---------|---------|----------|-------------|----------|--------|
| **WebSocket** | ✅ | ✅ | ✅ (вкл. вручную) | ✅ | ✅ авто | ✅ авто |
| **HTTP/3 / QUIC** | ❌ | ❌ | ❌ | ✅ (с Caddy) | ✅ (вкл. вручную) | ✅ **по умолчанию** |
| WebTransport | ❌ | ❌ | ❌ | ✅ (с Caddy) | ⚠️ экспериментально | ✅ |
| gRPC over HTTP/2 | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |

### Ресурсы и мониторинг

| Критерий | Coolify | Dokploy | CapRover | Portainer CE | +Traefik | +Caddy |
|---------|---------|---------|----------|-------------|----------|--------|
| CPU/RAM лимиты per-project | ✅ UI | ✅ UI | ✅ UI | ✅ compose | ✅ compose | ✅ compose |
| cgroup v2 enforcement | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Real-time container stats | ✅ | ✅ | ✅ NetData | ✅ | cAdvisor | cAdvisor |
| Исторические графики | ❌ встроенно | ❌ встроенно | ✅ NetData | ❌ | ✅ Grafana | ✅ Grafana |
| Prometheus | ❌ | ❌ | ✅ NetData | нужен cAdvisor | ✅ | ✅ + native |
| Grafana | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Network I/O monitoring | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ cAdvisor | ✅ |
| Kill switch | ✅ UI | ✅ UI | ✅ UI | ✅ UI | SSH | SSH |

### Доступ студентов

| Критерий | Coolify | Dokploy | CapRover | Portainer CE | +Traefik | +Caddy |
|---------|---------|---------|----------|-------------|----------|--------|
| Студенческие аккаунты | ✅ Teams | ✅ Members | ❌ | ✅ RBAC | ручной | ручной |
| Изоляция проектов | ✅ | ✅ | ❌ | ✅ | ✅ (папки) | ✅ (папки) |
| Логи в UI | ✅ | ✅ | ❌ | ✅ | Dozzle | Dozzle |
| DB browser | ❌ | ❌ | ❌ | ❌ | Adminer sidecar | Adminer sidecar |
| SSH не нужен | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Операционные характеристики

| Критерий | Coolify | Dokploy | CapRover | Portainer CE | +Traefik | +Caddy |
|---------|---------|---------|----------|-------------|----------|--------|
| Сложность установки (1–5) | 2 | **1** | 3 | 5 | 4 | 5 |
| Поддержка (1–5, меньше = проще) | 2 | **1** | 2 | 4 | 4 | 4 |
| Зрелость (лет в prod) | 3+ | 1+ | 8+ | 8+ | — | — |
| Активность разработки 2026 | ✅ высокая | ✅ высокая | ⚠️ средняя | ✅ | N/A | N/A |
| Лицензия | Apache 2.0 | Apache 2.0 | Apache 2.0 | Zlib | MIT/Apache | Apache 2.0 |
| Open source | ✅ | ✅ | ✅ | ✅ CE | ✅ | ✅ |

---

## Критические требования — чеклист

> Любой вариант, не соответствующий критическим требованиям, **исключается**.

| Критическое требование | Coolify | Dokploy | CapRover | Portainer CE | +Traefik | +Caddy |
|----------------------|---------|---------|----------|-------------|----------|--------|
| ✅ WebSocket (must) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ✅ docker-compose работает | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| ✅ Auto-deploy из GitHub | ✅ | ✅ | ⚠️ | ❌ нативно | ✅ runner | ✅ runner |
| ✅ SSL автоматически | ✅ | ✅ | ✅ | зависит | ✅ | ✅ |
| ✅ Изоляция студентов | ✅ | ✅ | **❌** | ✅ | ✅ | ✅ |
| **Итог** | ✅ | ✅ | ❌ | ⚠️ | ✅ | ✅ |

**CapRover исключается** — нет нативной изоляции студентов.
**Portainer CE** — требует значительной доработки для auto-deploy; оставляем как вариант для технического администратора.

---

## Итоговый рейтинг (взвешенная оценка)

| Критерий | Вес | Coolify | Dokploy | +Traefik | +Caddy |
|---------|-----|---------|---------|----------|--------|
| GitHub-интеграция | 15% | 9 | 9 | 7 | 7 |
| Docker Compose | 15% | 9 | 10 | 9 | 9 |
| WebSocket | 15% | 9 | 9 | 10 | 10 |
| SSL / wildcard | 10% | 7 | 7 | 7 | 10 |
| Студенческий доступ | 15% | 8 | 8 | 6 | 6 |
| Мониторинг | 10% | 5 | 5 | 9 | 9 |
| Простота (инверт.) | 10% | 8 | 10 | 6 | 5 |
| HTTP/3 | 5% | 1 | 1 | 8 | 10 |
| Активность | 5% | 9 | 8 | 9 | 9 |
| **Итого** | **100%** | **7.80** | **8.15** | **7.80** | **7.95** |

---

## Рекомендации

### 🥇 Основная рекомендация: Dokploy

**Причины:**
- Самая простая установка и поддержка
- `docker-compose.yml` работает без изменений (templatePWA работает as-is)
- Нативный GitHub App для GitHub org
- WebSocket из коробки
- Студенческие аккаунты и изоляция встроены
- Уже упомянут в README проекта как целевая платформа
- Активная разработка в 2026

**Что добавить поверх Dokploy:**

```
VPS Ubuntu 24.04 LTS
├── Dokploy (Traefik + PostgreSQL) ← основная платформа
├── cAdvisor + Prometheus + Grafana ← мониторинг
├── Dozzle                          ← логи для студентов
└── Adminer                         ← DB browser
```

**Нерешённые проблемы в Dokploy:**
- HTTP/3 недоступен (Traefik v2/v3 bundled, зависит от версии)
- Grafana нужно добавить отдельно (~1 час настройки)
- Двухуровневый wildcard требует Cloudflare API

---

### 🥈 Если HTTP/3 / WebTransport критичны: GitHub Actions + Caddy

**Причины выбора Caddy:**
- HTTP/3 включён по умолчанию — никакой настройки
- `on_demand_tls` решает проблему двухуровневого wildcard без Cloudflare API
- WebTransport — наиболее зрелая поддержка из всех вариантов
- Нативные Prometheus метрики

**Цена:** значительно больше времени на настройку (~10–15 часов), нужны скрипты для управления роутами.

---

### Coolify как альтернатива Dokploy

Coolify — хороший запасной вариант: более зрелый проект, богаче по функциям. Выбрать, если Dokploy нестабилен в актуальной версии или нужны специфические функции Coolify (multiple servers, advanced notifications и т.п.).

---

## Рекомендованный стек для старта

### Уровень 1: базовый (неделя 1)

```
Dokploy (включает Traefik + автоматический SSL)
  ↓
Wildcard DNS: *.tlfstudents.com → VPS IP (Cloudflare)
  ↓
GitHub App → org-репозитории → webhook → auto-deploy
  ↓
URL: tictactoe.petrov.tlfstudents.com
```

### Уровень 2: мониторинг (неделя 2)

```yaml
# /opt/monitoring/docker-compose.yml
services:
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.50.0
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker:/var/lib/docker:ro

  prometheus:
    image: prom/prometheus:v3.0.0

  grafana:
    image: grafana/grafana:11.0.0
    # Доступен по: grafana.tlfstudents.com
```

Grafana dashboards для импорта:
- [19792](https://grafana.com/grafana/dashboards/19792) — Docker containers
- [1860](https://grafana.com/grafana/dashboards/1860) — Node exporter (системные метрики)

### Уровень 3: инструменты студентов (неделя 3)

```yaml
# Dozzle — логи
services:
  dozzle:
    image: amir20/dozzle:v8
    # logs.tlfstudents.com

# Adminer — DB browser
  adminer:
    image: adminer:4
    # db.tlfstudents.com
```

---

## DNS-конфигурация (итоговая)

### Вариант A: один уровень поддоменов (проще)

URL-паттерн: `{student}-{project}.tlfstudents.com`

```
DNS:
*.tlfstudents.com → VPS IP    (обычный wildcard)
```

SSL: HTTP-01 challenge, никаких API ключей.

Пример: `petrov-tictactoe.tlfstudents.com`

### Вариант B: двухуровневые поддомены (удобнее для студентов)

URL-паттерн: `{project}.{student}.tlfstudents.com`

```
DNS (Cloudflare):
*.tlfstudents.com → VPS IP    (проксируется Cloudflare)
```

SSL: DNS-01 challenge через Cloudflare API (Dokploy/Coolify) или on_demand_tls (Caddy).

Пример: `tictactoe.petrov.tlfstudents.com`

**Рекомендуем Вариант B** — читаемее и логичнее для студентов.

---

## WebSocket — настройка в templatePWA

Для templatePWA с nginx-фронтенд + aiohttp-бэкенд:

**nginx.conf (frontend/nginx.conf) — проксирование WS к бэкенду:**
```nginx
location /ws/ {
    proxy_pass http://backend:8081;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
}
```

**Все рассмотренные платформы** (кроме CapRover без включения) обрабатывают WS upgrade на уровне reverse proxy автоматически. nginx внутри контейнера фронтенда обрабатывает `/ws/` → бэкенд независимо от платформы.

---

## HTTP/3 — итог

| Платформа | HTTP/3 | Как включить |
|-----------|--------|-------------|
| Coolify | ❌ | Нельзя без кастомизации |
| Dokploy | ❌/⚠️ | Зависит от bundled Traefik версии |
| CapRover | ❌ | Нельзя через UI |
| Portainer + Caddy | ✅ | По умолчанию |
| GH Actions + Traefik v3 | ✅ | `http3: {}` в config + UDP 443 |
| GH Actions + Caddy v2.9 | ✅ | По умолчанию + UDP 443 |

Если HTTP/3 нужен сейчас — выбирать кастомное решение с Caddy или Traefik v3.
Если HTTP/3 может подождать — Dokploy закрывает все основные требования, и HTTP/3 может быть добавлен позже при необходимости (перейти на кастомный Traefik поверх).
