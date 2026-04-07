# Фаза 01 — Перевод шаблона в фундамент яхтенного тренажёра

## Статус
- [x] Фаза реализована в коде и синхронизирована с документацией.
- [x] `konva`, `react-konva` и `ts-fsrs` уже добавлены в `frontend/package.json`; в этой фазе они не переустанавливаются вручную.

## Цель
Убрать шаблонные демо-фичи и подготовить чистый каркас для яхтенного тренажёра: рабочий логин, новая схема БД под колоды и FSRS, русскоязычный пустой UI и актуальная документация.

## Что сделано

### 1. Очистка шаблонного кода
- [x] Удалены backend-маршруты `notes/*`.
- [x] Удалён WebSocket-слой `backend/ws/`.
- [x] Удалены frontend-страницы и компоненты шаблонных заметок и admin-demo.
- [x] Удалены frontend `socket.ts`, `socket.test.ts` и связанные типы.
- [x] Сохранены `auth/*`, `GET /health`, пользователи и refresh-сессии.

### 2. Новая схема базы данных
- [x] Добавлена migration `004_drop_notes_table.py` для удаления старой таблицы `notes`.
- [x] Добавлена migration `005_create_decks.py`.
- [x] Добавлена migration `006_create_cards.py`.
- [x] Добавлена migration `007_create_card_states.py`.
- [x] Добавлена migration `008_create_review_log.py`.
- [x] Добавлена migration `009_create_user_settings.py`.

### 3. Пустой доменный UI
- [x] Главная страница перебрендирована под Yacht Anki.
- [x] Логин переведён на русский.
- [x] Дашборд заменён на empty state без review-функционала.
- [x] PWA manifest, `<title>` и мета-описание обновлены под новый продукт.

### 4. Seed и документация
- [x] Dev seed по-прежнему создаёт только пользователей `user` и `admin`.
- [x] Встроенные колоды и карточки не сидируются в фазе 01.
- [x] Root `AGENTS.md`, `frontend/AGENTS.md` и `README.md` обновлены под текущий продукт.

## Текущие интерфейсы после фазы

### Сохранились
- `POST /auth/login`
- `POST /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /health`

### Удалены
- `POST /notes/list`
- `POST /notes/save`
- `POST /notes/delete`
- `POST /admin/users/list`
- `GET /ws`

## Схема данных

### Таблица `decks`
- `id`, `slug`, `title`, `description`, `builtin`, `created_at`, `updated_at`

### Таблица `cards`
- `id`, `deck_id`, `template_type`, `prompt`, `answer`, `explanation`
- `diagram_spec`, `tags`, `sort_order`, `created_at`, `updated_at`

### Таблица `card_states`
- `id`, `user_id`, `card_id`, `fsrs_state_json`
- `phase`, `due_at`, `last_reviewed_at`, `created_at`, `updated_at`

### Таблица `review_log`
- `id`, `user_id`, `card_id`, `rating`
- `scheduled_days`, `elapsed_days`, `elapsed_ms`, `reviewed_at`

### Таблица `user_settings`
- `user_id`, `desired_retention`, `new_cards_per_day`, `reviews_per_day`, `updated_at`

### Дефолты
- `desired_retention = 0.90`
- `new_cards_per_day = 10`
- `reviews_per_day = NULL`

## Проверки фазы
- [x] Backend unit tests обновлены под auth-only каркас.
- [x] Добавлены smoke-тесты стартовой схемы БД.
- [x] Frontend unit tests обновлены под новый роутинг и пустой дашборд.
- [x] Playwright-сценарий проверяет логин, пустой дашборд и logout.
- [x] `make test`
- [x] Живая проверка в браузере без console/network/cookie ошибок

## Примечания для следующих фаз
- Фаза 02 начинает с API для `decks`, `cards`, `review`, `settings`.
- Фаза 03 использует `ts-fsrs`, но сами вычисления в фазе 01 ещё не подключены.
- Фаза 06 заполнит пустую схему реальным контентом из `docs/v1.md` и `docs/v2.md`.
