# Фаза 02 — Backend API для колод, повторения и настроек

## Статус
- [x] Фаза реализована в коде и синхронизирована с документацией.

## Цель
Добавить первый доменный backend-слой поверх схемы из фазы 01: чтение колод и карточек, очередь повторения, сохранение результатов ревью и пользовательские настройки FSRS.

## Что сделано

### 1. DB-модули
- [x] Добавлен `backend/db/decks.py` для глобальных колод.
- [x] Добавлен `backend/db/cards.py` для карточек и их JSON-полей.
- [x] Добавлен `backend/db/card_states.py` для per-user состояния и очереди повторения.
- [x] Добавлен `backend/db/review_log.py` для истории ответов и streak.
- [x] Добавлен `backend/db/user_settings.py` для настроек повторения.

### 2. HTTP route-группы
- [x] Добавлен `backend/http/deck_routes.py`.
- [x] Добавлен `backend/http/review_routes.py`.
- [x] Добавлен `backend/http/settings_routes.py`.
- [x] `backend/http/routes.py` оставляет `GET /health` и регистрирует setup-функции новых route-групп.

### 3. Публичные и приватные API

#### Публичные read-only endpoints
- [x] `POST /decks/list`
- [x] `POST /decks/get`
- [x] `POST /cards/list`

#### Auth-required endpoints
- [x] `POST /review/queue`
- [x] `POST /review/submit`
- [x] `POST /review/summary`
- [x] `POST /settings/get`
- [x] `POST /settings/save`

## Зафиксированные контракты

### Идентификаторы
- [x] Публичный идентификатор колоды — `slug`.
- [x] Карточки пока адресуются по numeric `id`.

### `POST /decks/list`
- [x] Принимает пустой JSON-объект.
- [x] Возвращает `decks[]` с `slug`, `title`, `description`, `builtin`, `card_count`.
- [x] Если пользователь залогинен, к каждой колоде добавляется `progress`.

### `POST /decks/get`
- [x] Принимает `{ "slug": string }`.
- [x] Возвращает одну колоду с `card_count`.
- [x] Для неизвестного `slug` возвращает `404`.

### `POST /cards/list`
- [x] Принимает `{ "deck_slug": string, "limit"?: number, "offset"?: number }`.
- [x] Значения по умолчанию: `limit = 50`, `offset = 0`.
- [x] Возвращает `deck`, `cards[]`, `total_count`, `limit`, `offset`.
- [x] `diagram_spec` и `tags` уже декодируются в JSON-структуры.
- [x] Если пользователь залогинен, у карточек есть `state`, иначе поле не добавляется.

### `POST /review/queue`
- [x] Поддерживает optional `{ "deck_slug"?: string }`.
- [x] Due-часть строится по `card_states.due_at <= now`, сортировка по `due_at`.
- [x] New-часть берёт карточки без `card_states` пользователя.
- [x] `reviews_per_day` режет due-часть, `new_cards_per_day` режет new-часть отдельно.
- [x] Возвращает `cards[]` и `summary` с `due_count`, `new_count`, `deck_slug`.

### `POST /review/submit`
- [x] Принимает `card_id`, `rating`, `fsrs_state`, `phase`, `due_at`, `elapsed_ms`.
- [x] Бэкенд валидирует только базовую форму payload и существование карточки.
- [x] `fsrs_state` хранится как opaque JSON в `card_states.fsrs_state_json`.
- [x] `card_states` обновляются через upsert по `(user_id, card_id)`.
- [x] `review_log` хранит `rating`, `scheduled_days`, `elapsed_days`, `elapsed_ms`, `reviewed_at`.
- [x] В ответе возвращается краткий `card_state`.

### `POST /review/summary`
- [x] Поддерживает optional `{ "deck_slug"?: string }`.
- [x] Возвращает `due_count`, `new_count`, `studied_cards_count`, `streak_days`, `deck_progress[]`.
- [x] Summary сразу покрывает будущие потребности Dashboard из фазы 05.

### `POST /settings/get` и `POST /settings/save`
- [x] `settings/get` создаёт дефолтную строку через `INSERT OR IGNORE`, если её ещё нет.
- [x] `settings/save` принимает полный объект настроек.
- [x] Валидируются диапазон `desired_retention`, daily limits и `reviews_per_day = null`.

## Тесты фазы
- [x] Добавлен `backend/tests/test_decks.py`.
- [x] Добавлен `backend/tests/test_cards.py`.
- [x] Добавлен `backend/tests/test_review.py`.
- [x] Добавлен `backend/tests/test_settings.py`.
- [x] `backend/tests/conftest.py` расширен helper-фикстурами для decks/cards/states/review_log/settings.

## Проверки фазы
- [x] Public deck/card endpoints работают для anon-пользователя.
- [x] Logged-in read endpoints дополняют ответы пользовательским прогрессом.
- [x] Review queue строится с учётом due/new, лимитов и optional `deck_slug`.
- [x] Review submit создаёт или обновляет `card_state` и пишет `review_log`.
- [x] Settings endpoints читают и сохраняют дефолты и пользовательские значения.
- [x] `make test`

## Примечания для следующих фаз
- Фаза 03 опирается на уже зафиксированный контракт `review/queue`, `review/submit`, `settings/get`, `settings/save`.
- Фаза 05 может использовать optional `deck_slug` без переделки review API для режима “учить только эту колоду”.
- Реальный контент по-прежнему не сидируется; он появится в фазе 06.
