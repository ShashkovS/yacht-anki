# Coolify

> Self-hosted Heroku / Vercel альтернатива с поддержкой docker-compose

**Версия:** v4.x (актуальная на 2026)
**Лицензия:** Apache 2.0
**GitHub:** [coollabsio/coolify](https://github.com/coollabsio/coolify)
**Язык:** PHP / Laravel (бэкенд), Next.js (UI)

---

## Архитектура

```
Coolify Server (VPS)
├── coolify          ← Laravel API + scheduler
├── coolify-db       ← PostgreSQL (состояние Coolify)
├── coolify-redis    ← очередь задач
├── traefik          ← reverse proxy (управляется Coolify)
└── Soketi           ← WebSocket push (для UI real-time)
```

Coolify управляет Traefik через Docker labels и конфиг-файлы. Пользователь видит только Coolify UI — Traefik остаётся «под капотом».

Coolify может управлять несколькими серверами через агентов. Для нашего сценария (один VPS) достаточно локального режима.

---

## GitHub-интеграция

- **Метод:** нативный GitHub App (OAuth-интеграция)
- **Организации:** полная поддержка — можно ограничить список репозиториев
- **Триггер:** webhook от GitHub на push в настраиваемую ветку (`main`)
- **Без GitHub Actions runner:** Coolify принимает webhook сам, запускает сборку на VPS
- **Сборка:** `docker compose build && docker compose up -d` из репозитория
- **Secrets:** вводятся в Coolify UI → передаются как env vars в контейнеры

> Webhook URL должен быть доступен с серверов GitHub (публичный IP VPS — ок).

---

## Поддержка Docker Compose

- **Полная нативная поддержка** `docker-compose.yml`
- Читает файл из корня репозитория (путь настраивается)
- Multi-service: ✅ (frontend + backend в одном compose)
- Named volumes: ✅ (SQLite-том из templatePWA работает)
- Env-injection: Coolify добавляет переменные окружения поверх compose-файла студента
- **Compose-файл студента остаётся без изменений** — Coolify накладывает Traefik labels через свой механизм

---

## Reverse Proxy и SSL

- **Proxy:** Traefik v2.x (bundled, версия зависит от релиза Coolify)
- **Let's Encrypt HTTP-01:** ✅ для обычных поддоменов
- **Wildcard DNS-01:** ✅ поддерживается, но требует DNS API (Cloudflare, Route53 и др.)
- **Двухуровневый wildcard** `*.*.tlfstudents.com`:
  - Нужен DNS-01 challenge через Cloudflare API
  - В Coolify UI задаётся Cloudflare API token
  - Реально рабочая схема, но требует Cloudflare как DNS-провайдер
- **Кастомный домен per-project:** ✅ задаётся в UI

---

## WebSocket

**✅ Работает из коробки.** Traefik автоматически проксирует WebSocket-соединения (upgrade headers). Никакой дополнительной конфигурации не требуется.

`templatePWA` aiohttp `WebSocketHub` — работает без изменений.

---

## HTTP/3

**❌ Недоступен** в стандартной конфигурации Coolify.

Coolify использует Traefik v2.x, в котором HTTP/3 поддерживается только как экспериментальная функция и не включена по умолчанию. Coolify не предоставляет UI для включения HTTP/3.

Обходной путь: ручное редактирование Traefik-конфига — рискованно, может сломаться при обновлении Coolify.

> WebTransport API: недоступен (зависит от HTTP/3).

---

## Ресурсные лимиты

- **Per-container CPU/RAM:** ✅ задаются в Coolify UI
- Механизм: Docker `--cpus` / `--memory` flags (cgroup v2)
- Изменение лимитов без пересоздания контейнера: ✅

---

## Мониторинг

| Функция | Статус |
|---------|--------|
| Real-time container stats в UI | ✅ |
| Исторические графики (Grafana) | ❌ встроенно нет |
| Prometheus endpoint | ❌ встроенно нет |
| Prometheus + Grafana как доп. стек | ✅ можно развернуть рядом |
| Логи контейнеров в UI | ✅ |

Для полноценного мониторинга нужно отдельно поднять cAdvisor + Prometheus + Grafana.

---

## Доступ студентов

- **Аккаунты:** ✅ Coolify поддерживает Teams — создать команду на студента, выдать Member-роль
- **Изоляция:** ✅ студент видит только проекты своей команды
- **Логи:** ✅ доступны в Coolify UI для проектов команды
- **DB browser:** ❌ не встроен; решение — добавить Adminer как отдельный сервис в compose студента
- **Доступ к SQLite-файлу:** через Adminer или временный `docker cp` (только admin)

---

## Администраторские возможности

- Dashboard с состоянием всех проектов: ✅
- Kill switch (stop/restart): ✅
- Email-уведомления о деплое: ✅
- Бэкап баз данных (S3 / local): ✅
- Audit log: ⚠️ ограниченный
- Marketplace приложений: ❌

---

## Сложность установки

**Первоначальная установка:** ~2–4 часа до production-ready состояния

```bash
# Установка одной командой
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Устанавливает Docker, Traefik, Coolify. После — веб-UI на порту 8000.

**Подключение GitHub org:** ~10 минут через OAuth-настройку в UI.

**Онбординг студента:** создать команду, выдать доступ к репозиторию, настроить деплой через UI — ~5 минут на студента.

**Поддержка:** низкая (Coolify управляет Traefik сам).

---

## Плюсы

- Самый быстрый старт среди всех платформ
- `docker-compose.yml` студента работает без изменений
- WebSocket из коробки
- Полноценный UI для студентов (логи, статус деплоя)
- Активная разработка, большое сообщество
- DNS-01 wildcard поддерживается нативно

## Минусы

- HTTP/3 недоступен (Traefik v2)
- Prometheus/Grafana — только отдельной установкой
- Двухуровневый wildcard требует Cloudflare (или аналог)
- Traefik-конфиг непрозрачен — сложно кастомизировать
- Зависимость от внутренней архитектуры Coolify при обновлениях

---

## Ключевые версии (2026)

| Компонент | Версия |
|-----------|--------|
| Coolify | v4.0.x |
| Traefik (bundled) | v2.11.x |
| Docker Compose | v2.x |
| PostgreSQL (internal) | v15+ |
| Let's Encrypt | ACME v2 |

---

## Вывод

**Coolify — отличный выбор для быстрого старта**, если HTTP/3 не критичен. Нативная интеграция с GitHub, полная поддержка docker-compose, студенческие аккаунты — всё есть из коробки. Единственная доработка: добавить Prometheus + Grafana-стек для полноценного мониторинга.
