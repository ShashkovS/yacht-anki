# Portainer CE

> Docker/Kubernetes management UI — не PaaS, но мощный инструмент управления контейнерами

**Версия:** CE v2.21.x (Community Edition)
**Лицензия:** Zlib (CE)
**GitHub:** [portainer/portainer](https://github.com/portainer/portainer)
**Язык:** Go (backend), Angular (UI)
**Важно:** Portainer — это NOT PaaS. Это инструмент управления Docker. CI/CD нужно строить отдельно.

---

## Архитектура

```
VPS
├── Portainer Server    ← UI + API (порт 9443)
├── Reverse Proxy       ← Traefik v3 или Caddy (отдельная установка!)
├── GitHub Actions      ← self-hosted runner (отдельная установка!)
│   runner
└── Student Projects    ← Docker Stacks (= docker-compose)
    ├── stack: tictactoe-petrov
    └── stack: pong-ivanov
```

Portainer управляет Docker Stacks (это docker-compose.yml в терминах Portainer). Reverse proxy и CI/CD — полностью на ответственности администратора.

---

## GitHub-интеграция

**Нет нативной:** Portainer CE не имеет встроенной GitHub-интеграции для auto-deploy.

**Варианты:**

1. **GitHub Actions self-hosted runner** → вызывает Portainer API:
   ```bash
   # В GitHub Actions workflow:
   curl -X POST \
     -H "X-API-Key: $PORTAINER_API_KEY" \
     "https://portainer.tlfstudents.com/api/stacks/1/git/redeploy"
   ```

2. **Stack Webhooks** (Portainer CE): каждый Stack имеет webhook URL → GitHub repo Settings → Webhooks → добавить URL Portainer Stack webhook

3. **Portainer BE (платная):** нативные Git-linked Stacks с auto-pull

**Рекомендуемый подход для нашего сценария:** вариант 1 (GitHub Actions + API).

---

## Поддержка Docker Compose

**Лучшая поддержка из всех рассмотренных платформ:**

- Stacks = docker-compose.yml нативно: ✅
- Студент загружает `docker-compose.yml` → Portainer создаёт Stack
- Multi-service: ✅
- Named volumes: ✅
- Env vars: задаются в Portainer UI при создании Stack
- Файл студента **без изменений** (кроме Traefik labels, если используется Traefik)

---

## Reverse Proxy и SSL

**Не включён — нужна отдельная установка.** Это плюс (полный контроль) и минус (дополнительная работа).

**Варианты:**

**Traefik v3:**
- Управляется через Docker labels в compose-файле студента
- HTTP/3 поддерживается (нужно включить явно)
- DNS-01 для wildcard через Cloudflare

**Caddy v2.9:**
- Управляется через Admin API или Caddyfile
- HTTP/3 включён по умолчанию
- on_demand_tls решает проблему двухуровневого wildcard
- Более простая конфигурация

Portainer + Caddy = **лучший выбор для HTTP/3** среди всех рассмотренных вариантов.

---

## WebSocket

**✅ Зависит от выбранного reverse proxy:**

- Traefik v3: WebSocket автоматически
- Caddy: WebSocket автоматически
- nginx: нужно `proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade;`

Все три варианта поддерживают WebSocket хорошо.

---

## HTTP/3

**✅ Полностью достижимо** — лучший вариант из всех платформ.

С Caddy v2.9: HTTP/3 включён по умолчанию, ничего не нужно настраивать.
С Traefik v3: включить `http3: {}` в entryPoints config.
С nginx: нужен модуль `--with-http_v3_module`.

Portainer не ограничивает выбор reverse proxy — можно взять лучший инструмент.

---

## Ресурсные лимиты

- **Per-container:** ✅ через `deploy.resources.limits` в docker-compose.yml
  ```yaml
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
  ```
- Или через Portainer UI при создании/редактировании Stack
- cgroup v2: ✅ на Ubuntu 22.04+

---

## Мониторинг

| Функция | Статус |
|---------|--------|
| Базовые container stats в UI | ✅ (Portainer встроенный) |
| Prometheus | ✅ отдельная установка (cAdvisor + Prometheus) |
| Grafana | ✅ отдельная установка |
| NetData | ✅ отдельная установка |
| Полный контроль над стеком | ✅ |

Portainer не ограничивает выбор мониторинга — можно использовать лучшие инструменты:
- **cAdvisor** → автоматически собирает метрики всех контейнеров
- **Prometheus** → хранение time-series данных
- **Grafana** → dashboards (импортировать dashboard ID 893 для Docker/cAdvisor)

---

## Доступ студентов

**RBAC — лучший из всех платформ:**

- **Пользователи:** ✅ можно создать отдельный аккаунт per-student
- **Команды:** ✅ группировать студентов
- **Scoped access:** ✅ студент видит только назначенные Stacks
- **Логи:** ✅ доступны в Portainer UI для своих Stacks
- **DB browser:** ❌ не встроен → Adminer как отдельный Stack

Portainer CE поддерживает полноценное разграничение доступа.

---

## Администраторские возможности

| Функция | Статус |
|---------|--------|
| Обзор всех контейнеров | ✅ |
| Image management | ✅ |
| Volume management | ✅ |
| Network management | ✅ |
| Kill switch | ✅ |
| Audit log | ⚠️ ограниченный в CE |
| App templates | ✅ |

---

## Сложность установки

**Самая сложная из всех вариантов: ~6–10 часов**

```bash
# Portainer
docker run -d -p 8000:8000 -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

После установки нужно:
1. Настроить Caddy или Traefik (отдельный compose-стек)
2. Настроить DNS (Cloudflare)
3. Настроить GitHub Actions self-hosted runner
4. Написать `.github/workflows/deploy.yml` (reusable workflow для org)
5. Развернуть cAdvisor + Prometheus + Grafana
6. Развернуть Dozzle (логи) или настроить доступ студентов через Portainer
7. Создать студенческие аккаунты и назначить права
8. Написать onboarding-документацию для студентов

---

## Плюсы

- **Максимальная гибкость** — нет ограничений от платформы
- **HTTP/3 полностью достижим** (с Caddy)
- Лучшее RBAC из всех вариантов
- Полный контроль над reverse proxy и SSL
- Отличная поддержка docker-compose (Stacks)
- Мониторинг — выбирай лучшее решение
- Нет vendor lock-in
- Хорошо документирован

## Минусы

- **Не PaaS** — CI/CD полностью на ответственности администратора
- Самая высокая начальная сложность
- Требует написания GitHub Actions workflows
- Нет built-in reverse proxy и SSL
- Много движущихся частей — сложнее в поддержке
- Portainer CE отстаёт от BE по функциям

---

## Ключевые версии (2026)

| Компонент | Версия |
|-----------|--------|
| Portainer CE | v2.21.x |
| Caddy (рекомендуется) | v2.9.x |
| cAdvisor | v0.50+ |
| Prometheus | v3.x |
| Grafana | v11.x |
| GitHub Actions runner | v2.x |

---

## Вывод

Portainer CE — **выбор для технического администратора**, который хочет полный контроль и готов потратить время на настройку. Идеален, если HTTP/3 критичен или нужна полная кастомизация. Для быстрого старта лучше Dokploy или Coolify.
