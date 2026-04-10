# Исследование платформ деплоя для учебных проектов

## Контекст

Нужно организовать деплой учебных проектов ~20 школьников на одном VPS с автоматизацией через GitHub.

**Инфраструктура:**
- VPS: 16 vCPU, 32 GB RAM, 320 GB SSD (чистый сервер)
- Домен: `tlfstudents.com` (чистый, новый)
- GitHub-организация школы

**Эталонный проект:** [`templatePWA`](../docker-compose.yml) — React-фронтенд (nginx) + Python/aiohttp бэкенд + SQLite, деплоится через `docker-compose.yml`.

**Сценарий работы:**

> Школьник `petrov` (GitHub: `ipetrosuper`) создаёт репозиторий `tictactoe` в org.
> В нём есть `docker-compose.yml`.
> После пуша в `main` приложение автоматически появляется по адресу
> `tictactoe.petrov.tlfstudents.com` с HTTPS и WebSocket.

---

## Формальные требования

### Функциональные

| ID | Требование |
|----|-----------|
| FR-1 | Push в `main` → автоматический деплой без участия администратора |
| FR-2 | URL-паттерн: `{project}.{student}.tlfstudents.com` |
| FR-3 | Автоматический SSL (Let's Encrypt), авторенование |
| FR-4 | **WebSocket — обязательно** (aiohttp WebSocketHub в templatePWA) |
| FR-5 | HTTP/3 / WebTransport — желательно (для будущих проектов с WebTransport API) |
| FR-6 | `docker-compose.yml` студента работает без изменений |
| FR-7 | Студент видит логи своих контейнеров |
| FR-8 | Студент имеет доступ к своей БД (SQLite, PostgreSQL) |
| FR-9 | Изоляция: студент не видит проекты других |

### Администраторские

| ID | Требование |
|----|-----------|
| ADM-1 | Ограничение CPU/RAM per-project |
| ADM-2 | Мониторинг: CPU, RAM, Network I/O, Disk per-container |
| ADM-3 | Исторические графики (Grafana/Prometheus) |
| ADM-4 | Kill switch — остановить любой проект |
| ADM-5 | Централизованные логи |

### Нефункциональные

| ID | Требование |
|----|-----------|
| NFR-1 | Open source, без vendor lock-in |
| NFR-2 | Поддерживается одним администратором (не DevOps-команда) |
| NFR-3 | Активная разработка в 2026 году |

---

## Оценка нагрузки

При 20 одновременных проектах типа templatePWA (2 контейнера: frontend + backend):

| Ресурс | Baseline (idle) | Пиковая |
|--------|----------------|---------|
| RAM | ~5 GB (20 × 256 MB) | ~10 GB |
| CPU | ~2 vCPU | ~6 vCPU |
| Диск | ~20 GB образов + данные | — |

**Выводы:** 32 GB RAM даёт 3× запас. 16 vCPU достаточно с запасом. На одном VPS реалистично держать 50+ таких проектов.

Дополнительный overhead платформы + мониторинга: ~2 GB RAM, ~1 vCPU.

---

## Критическая проблема DNS: двухуровневый wildcard

Паттерн `{project}.{student}.tlfstudents.com` требует **двухуровневого wildcard**.

**Стандартный DNS wildcard** (`*.tlfstudents.com`) покрывает только один уровень:
- ✅ `petrov.tlfstudents.com`
- ❌ `tictactoe.petrov.tlfstudents.com`

**Решения:**

1. **Cloudflare DNS + wildcard A-запись** `*.tlfstudents.com → VPS IP`:
   - Cloudflare проксирует и маршрутизирует `*.*.tlfstudents.com`
   - Для SSL нужен DNS-01 ACME challenge через Cloudflare API
   - Работает с Traefik и Caddy

2. **Caddy `on_demand_tls`** — выдаёт сертификат для каждого домена при первом запросе:
   - Не нужен wildcard-сертификат
   - Работает с любым DNS-провайдером
   - Требует approval endpoint (простой микросервис)

3. **Упрощённый паттерн** `{student}-{project}.tlfstudents.com` (один уровень):
   - Обычный wildcard `*.tlfstudents.com`
   - HTTP-01 challenge, без Cloudflare API
   - Менее читаемый URL

---

## Типы проектов студентов

| Тип | Пример | Особенности |
|-----|--------|-------------|
| Web + backend | templatePWA | Frontend (nginx), backend (Python/Go/Node), SQLite |
| Telegram-бот | bot.petrov.tlfstudents.com | Только backend, webhook HTTPS |
| Backend для мобильного | api.petrov.tlfstudents.com | REST API, WebSocket |

---

## Файлы исследования

| Файл | Содержание |
|------|-----------|
| [coolify.md](coolify.md) | Coolify v4 — детальный анализ |
| [dokploy.md](dokploy.md) | Dokploy — детальный анализ |
| [caprover.md](caprover.md) | CapRover — детальный анализ |
| [portainer.md](portainer.md) | Portainer CE — детальный анализ |
| [custom-traefik.md](custom-traefik.md) | Кастом: GitHub Actions + Traefik v3 |
| [custom-caddy.md](custom-caddy.md) | Кастом: GitHub Actions + Caddy v2.9 |
| [comparison.md](comparison.md) | Сравнительная таблица и итоговая рекомендация |
