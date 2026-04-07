# Фаза 07 — Реальные страницы статистики и настроек

## Summary
Цель фазы 07: заменить placeholders на рабочие `/stats` и `/settings`, не меняя архитектуру приложения. После этой фазы пользователь видит статистику по review-истории и может менять FSRS-настройки через штатные user-settings endpoints.

## Реализация
- Backend:
  - добавлен `backend/db/stats.py` с явными SQL-агрегациями по `review_log`, `card_states`, `cards`, `decks`;
  - добавлен `POST /stats/get` в `backend/http/stats_routes.py`;
  - `POST /review/summary` оставлен компактным dashboard endpoint;
  - `POST /settings/get` и `POST /settings/save` сохранены как основной wire contract;
  - в `settings/save` retention теперь валидируется в диапазоне `0.70..0.97`.
- Frontend:
  - добавлены реальные `StatsPage` и `SettingsPage`;
  - маршруты `/stats` и `/settings` больше не используют placeholder page;
  - dashboard остаётся на `review/summary`, а расширенная статистика идёт через `stats/get`.

## Public API
- Новый endpoint: `POST /stats/get`
  - Auth required
  - Request: пустой JSON object
  - Response:
    - `today: { review_count, average_rating }`
    - `activity_30d: Array<{ day, review_count }>`
    - `rating_distribution_30d: Array<{ rating, count }>`
    - `deck_progress`
    - `hardest_cards: Array<{ card_id, deck_slug, deck_title, prompt, again_count, review_count }>`
    - `overall_progress: { review_cards, total_cards, percent_review }`
    - `streak_days`
    - `studied_cards_count`
- Existing endpoint update:
  - `POST /settings/save` принимает тот же payload shape, но `desired_retention` должен быть в диапазоне `0.70..0.97`.

## UI
- `StatsPage`:
  - summary cards: `Сегодня`, `Серия`, `Изучено`, `В review`
  - activity chart за 30 дней без chart library
  - rating distribution для `Again`, `Hard`, `Good`, `Easy`
  - hardest cards с CTA `Учить колоду`
  - progress blocks по колодам
- `SettingsPage`:
  - retention slider `0.70..0.97`
  - integer input для новых карточек
  - integer input + checkbox `Без лимита повторений`
  - loading, error, success, dirty-state и disabled save button

## Проверки
- Backend:
  - `backend/tests/test_stats.py`
  - `backend/tests/test_settings.py`
- Frontend:
  - `frontend/src/pages/StatsPage.test.tsx`
  - `frontend/src/pages/SettingsPage.test.tsx`
  - обновлён `frontend/src/app/App.test.tsx`
- E2E:
  - login → review → stats
  - login → settings save → reload → review queue uses new limit

## Assumptions
- Фаза 07 не требует миграций БД.
- Day buckets и `today` считаются по UTC, потому что текущая review-history уже живёт на UTC-логике.
- Hardest cards ведут в deck-scoped review или deck detail, а не в route отдельной карточки.
- Новые settings применяются к следующей загрузке review queue; текущая уже открытая сессия не пересчитывается на лету.
