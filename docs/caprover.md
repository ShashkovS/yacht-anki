# CapRover

> Зрелая self-hosted PaaS платформа с отличным встроенным мониторингом

**Версия:** v1.12.x (стабильная)
**Лицензия:** Apache 2.0
**GitHub:** [caprover/caprover](https://github.com/caprover/caprover)
**Язык:** Node.js
**Активность:** разработка замедлилась по сравнению с Coolify/Dokploy, но проект поддерживается

---

## Архитектура

```
CapRover Server (VPS)
├── captain             ← Node.js API + UI (Captain Dashboard)
├── nginx               ← reverse proxy (управляется CapRover)
├── NetData             ← встроенный мониторинг (killer feature)
└── docker daemon       ← запуск контейнеров
```

CapRover уникален тем, что использует **nginx** (не Traefik) и **NetData** для мониторинга. Это даёт превосходный built-in monitoring, но требует другого подхода к конфигурации.

---

## GitHub-интеграция

- **Метод:** webhook на push (нет нативного GitHub App, более ручная настройка)
- **Организации:** webhook настраивается на уровне репозитория
- **Автодеплой:** через Captain webhook URL в настройках GitHub repo
- **Минус:** нет центрального управления всеми репозиториями — каждый webhook настраивается отдельно

---

## Поддержка Docker Compose

⚠️ **Частичная поддержка с оговорками.**

CapRover использует собственный формат `captain-definition` для описания деплоя:

```json
{
  "schemaVersion": 2,
  "dockerComposeFileLocation": "./docker-compose.yml"
}
```

- Файл `captain-definition` должен быть в корне репозитория
- docker-compose.yml: поддерживается через captain-definition
- Multi-service: через One-Click Apps или captain-definition
- **Студенту нужно добавить `captain-definition`** — дополнительный файл в репозиторий
- Named volumes: поддерживаются

**Вывод:** студент не может использовать только `docker-compose.yml` без дополнительного файла — это friction по сравнению с Coolify/Dokploy.

---

## Reverse Proxy и SSL

- **Proxy:** nginx (управляется CapRover)
- **Let's Encrypt HTTP-01:** ✅ (через captain UI одной кнопкой)
- **Wildcard DNS-01:** ⚠️ поддерживается, но настройка менее удобна
- **WebSocket:** ✅ nginx поддерживает, нужно включить опцию в CapRover UI per-app
- **Кастомный домен:** ✅

---

## WebSocket

**✅ Поддерживается**, но требует явного включения в CapRover UI:

В настройках приложения → "Enable WebSocket Support" (добавляет `proxy_http_version 1.1` и upgrade-headers в nginx).

Без этой галочки WebSocket не работает — лёгкий источник путаницы.

---

## HTTP/3

**❌ Недоступен** в стандартном CapRover.

nginx поддерживает HTTP/3 (QUIC) начиная с версии 1.25+ с модулем `--with-http_v3_module`, но CapRover не предоставляет UI для его включения. Кастомный nginx-конфиг — возможен, но сложен и не поддерживается официально.

---

## Ресурсные лимиты

- **Per-app CPU/RAM:** ✅ задаются в CapRover UI
- Механизм: Docker resource constraints

---

## Мониторинг

**Это главное преимущество CapRover:**

| Функция | Статус |
|---------|--------|
| NetData (встроен) | ✅ отличный real-time мониторинг |
| CPU per-container | ✅ NetData |
| RAM per-container | ✅ NetData |
| Network I/O | ✅ NetData |
| Disk I/O | ✅ NetData |
| Исторические данные | ✅ NetData хранит историю |
| Prometheus export | ✅ NetData имеет Prometheus endpoint |
| Grafana | ⚠️ не встроен, но NetData достаточно |

NetData — это мощный инструмент с готовыми dashboards для всех метрик. В контексте CapRover это его главное преимущество перед Coolify/Dokploy.

---

## Доступ студентов

⚠️ **Критический недостаток.**

CapRover CE (Community Edition) имеет **один admin-аккаунт**. Нет нативной мультипользовательской системы.

Варианты обхода:
1. Выдать каждому студенту admin-пароль — отсутствие изоляции, неприемлемо
2. Развернуть **отдельный CapRover** per-student — overkill, сложно в управлении
3. Создать прокси-UI поверх CapRover API — кастомная разработка

**Вывод:** CapRover плохо подходит для мультипользовательского сценария с изоляцией между студентами.

---

## Администраторские возможности

- One-Click Apps marketplace (Adminer, GitLab, PostgreSQL и др.): ✅
- Captain Dashboard с обзором всех приложений: ✅
- NetData monitoring: ✅ (лучший встроенный monitoring среди всех платформ)
- Kill switch: ✅
- Notifications: ❌ не встроены

---

## Сложность установки

**Первоначальная установка:** ~3–5 часов + время на workaround для multi-user

```bash
docker run -e ACCEPTED_TERMS=true \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /captain:/captain \
  -p 80:80 -p 443:443 -p 3000:3000 \
  caprover/caprover
```

После: настройка через `caprover serversetup` CLI.

**Дополнительная сложность:** captain-definition в каждом репозитории + отсутствие нативного GitHub App.

---

## Плюсы

- **Лучший встроенный мониторинг** (NetData) из всех платформ
- Самый зрелый проект (с 2018)
- One-Click Apps marketplace
- Battle-tested в production
- nginx более привычен, чем Traefik для многих

## Минусы

- **Нет нативного multi-user** — критично для 20 студентов
- captain-definition добавляет friction (студенты должны его создавать)
- GitHub-интеграция требует ручной настройки per-repo
- HTTP/3 недоступен
- Разработка замедлилась
- WebSocket нужно включать вручную per-app

---

## Ключевые версии (2026)

| Компонент | Версия |
|-----------|--------|
| CapRover | v1.12.x |
| nginx | 1.25+ |
| NetData | latest |
| Docker Engine | 24+ |

---

## Вывод

CapRover **не рекомендуется** для данного сценария из-за отсутствия мультипользовательской поддержки — это критический недостаток. Однако, если администратор готов управлять всем сам, а студентам не нужен доступ к UI — NetData-мониторинг делает его привлекательным вариантом для опытного DevOps-администратора.
