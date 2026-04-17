# Dokploy

> Простая self-hosted PaaS платформа, нативно заточенная под docker-compose

**Версия:** v0.x (быстро развивается, проверять актуальный тег)
**Лицензия:** Apache 2.0
**GitHub:** [Dokploy/dokploy](https://github.com/Dokploy/dokploy)
**Язык:** TypeScript / Next.js
**Примечание:** уже упомянут в `README.md` проекта `templatePWA` как целевая платформа деплоя

---

## Архитектура

```
Dokploy Server (VPS)
├── dokploy          ← Next.js API + UI
├── dokploy-db       ← PostgreSQL (состояние)
├── traefik          ← reverse proxy (управляется Dokploy)
└── docker daemon    ← запуск контейнеров студентов
```

Легковесная альтернатива Coolify с похожей архитектурой, но меньшим количеством абстракций. Ориентирован на простоту использования.

---

## GitHub-интеграция

- **Метод:** GitHub App или Personal Access Token
- **Организации:** ✅ поддерживает org-репозитории
- **Триггер:** webhook на push в ветку (настраивается)
- **Сборка:** `docker compose build && docker compose up -d` на VPS
- **Без GitHub Actions runner:** Dokploy принимает webhook сам
- **Secrets/Env vars:** вводятся в Dokploy UI, передаются в контейнеры

---

## Поддержка Docker Compose

- **Нативная поддержка:** ✅ — первоклассный citizen
- `docker-compose.yml` из корня репозитория
- Multi-service (frontend + backend + db): ✅
- Named volumes: ✅
- Файл студента **остаётся без изменений**
- Env-overrides: Dokploy передаёт переменные сверху

**templatePWA совместимость:** полная — compose-файл с backend + frontend + sqlite_data volume работает as-is.

---

## Reverse Proxy и SSL

- **Proxy:** Traefik (bundled, версия меняется — проверять в релизах)
- **Let's Encrypt HTTP-01:** ✅
- **Wildcard DNS-01:** ✅ (в зависимости от версии, поддержка добавлялась)
- **Двухуровневый wildcard** `*.*.tlfstudents.com`:
  - Как и в Coolify: требует DNS-01 через Cloudflare API
  - Настраивается в Dokploy UI
- **Кастомный домен per-project:** ✅

---

## WebSocket

**✅ Работает из коробки.** Traefik обрабатывает WebSocket upgrade автоматически.

`templatePWA` aiohttp WebSocket — работает без изменений.

---

## HTTP/3

**❌ Не поддерживается** (аналогично Coolify).

Dokploy использует Traefik bundled. HTTP/3 не включён. Самостоятельная кастомизация Traefik-конфига — рискованна и не поддерживается официально.

---

## Ресурсные лимиты

- **Per-service CPU/RAM:** ✅ задаются в Dokploy UI
- Механизм: Docker resource constraints (cgroup v2)
- Интерфейс проще, чем у Coolify

---

## Мониторинг

| Функция | Статус |
|---------|--------|
| Real-time stats в UI | ✅ |
| Серверные метрики (CPU/RAM/Disk) | ✅ в Dashboard |
| Prometheus-интеграция | ⚠️ в разработке (roadmap) |
| Grafana | ❌ встроенно нет, нужен отдельный стек |
| Логи контейнеров в UI | ✅ |

---

## Доступ студентов

- **Аккаунты:** ✅ система ролей: admin / member
- **Изоляция per-project:** ✅ member видит только назначенные проекты
- **Логи:** ✅ доступны в Dokploy UI для проектов студента
- **DB browser:** ❌ не встроен → добавить Adminer как compose-сервис
- **SSH:** не нужен — всё через UI

---

## Администраторские возможности

- Список всех проектов и их статус: ✅
- Stop/Start/Restart любого проекта: ✅
- Email / Slack / Discord webhook уведомления: ✅
- Просмотр build-логов: ✅
- Audit log: ⚠️ минимальный

---

## Сложность установки

**Первоначальная установка:** ~1–3 часа

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

После установки — UI на `http://VPS_IP:3000`.

Шаги после установки:
1. Создать admin-аккаунт
2. Подключить GitHub App (OAuth)
3. Настроить домен и Traefik (SSL)
4. Создать студенческие аккаунты
5. Для каждого студента создать Project → Source (GitHub repo) → Deploy

**Поддержка:** низкая — Dokploy управляет Traefik сам.

---

## Плюсы

- **Самая простая установка** из всех платформ
- `docker-compose.yml` работает без изменений (templatePWA)
- WebSocket из коробки
- Студенческий UI — удобный и понятный
- Активная разработка в 2026
- Легковесный (меньше RAM, чем Coolify)
- Уже знаком команде (упомянут в README)

## Минусы

- HTTP/3 недоступен
- Мониторинг менее зрелый, Prometheus-интеграция ещё в разработке
- Молодой проект — возможны breaking changes между версиями
- Меньшее сообщество, чем у Coolify
- Двухуровневый wildcard требует Cloudflare

---

## Ключевые версии (2026)

| Компонент | Версия |
|-----------|--------|
| Dokploy | проверять releases |
| Traefik (bundled) | проверять в compose.yml Dokploy |
| Docker Compose | v2.x |
| PostgreSQL (internal) | v15+ |

---

## Вывод

**Dokploy — рекомендуемая платформа** для данного сценария. Проще Coolify, шире поддержка docker-compose, уже используется в templatePWA-экосистеме. Идеален для быстрого старта без DevOps-экспертизы. Недостающие элементы (Grafana, Adminer) легко добавляются как дополнительные compose-стеки.
