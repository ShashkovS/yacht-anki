# Фаза 08 — Финальная полировка: offline-review, PWA и mobile UX

## Summary
Цель фазы 08: довести приложение до состояния, в котором им удобно пользоваться на телефоне и можно безопасно продолжать уже загруженное повторение без сети. После этой фазы progress по-прежнему хранится только в аккаунте, но frontend умеет кэшировать queue и важные snapshots в IndexedDB, а review-ответы синхронизируются после reconnect через существующий `POST /review/submit`.

## Реализация
- Backend:
  - добавлена миграция `011_add_review_log_client_event_id.py`;
  - `review_log` теперь хранит `client_event_id`;
  - `POST /review/submit` принимает `reviewed_at` и `client_event_id`;
  - backend пишет клиентское время в `review_log.reviewed_at` и `card_states.last_reviewed_at`;
  - повторная отправка того же `client_event_id` стала idempotent и не создаёт дубль.
- Frontend offline:
  - добавлен IndexedDB store для `pending_review_events`, `cached_review_queue`, `api_snapshots`;
  - review session теперь:
    - синхронизирует pending events перед online queue load;
    - падает обратно на cached review session при `network_error`;
    - при offline submit локально двигает queue и сохраняет pending review event;
    - сохраняет обновлённую session в cache после каждого ответа;
  - страницы `dashboard`, `decks`, `deck detail`, `stats`, `settings` умеют показывать последний сохранённый snapshot при отсутствии сети.
- UI и mobile:
  - добавлен app-wide offline banner и badge c количеством pending sync answers;
  - `ReviewPage` показывает offline/cached notices;
  - после reveal rating buttons собраны в sticky bottom action area на узких экранах;
  - touch handle для поворота лодки увеличен;
  - header и основные карточки лучше складываются на narrow viewport.
- PWA и production:
  - `vite-plugin-pwa` оставлен, но manifest и Workbox-конфиг доведены до production-ready состояния;
  - production nginx теперь проксирует `/auth`, `/health`, `/decks`, `/cards`, `/review`, `/settings`, `/stats` на backend service;
  - `docker-compose.yml` переведён на same-origin production path: публичным остаётся frontend, backend становится внутренним сервисом по умолчанию.

## Public API
- `POST /review/submit`
  - новые обязательные поля:
    - `reviewed_at: ISO datetime`
    - `client_event_id: string`
  - существующие поля `card_id`, `rating`, `fsrs_state`, `phase`, `due_at`, `elapsed_ms` сохраняются.
- Поведение `review/submit`:
  - `reviewed_at` считается canonical review timestamp;
  - duplicate `client_event_id` для того же пользователя больше не создаёт вторую запись в `review_log`;
  - ответ остаётся в том же shape:
    - `card_state: { card_id, phase, due_at, last_reviewed_at }`.

## Ограничения и defaults
- Offline review работает только если пользователь уже был онлайн, был залогинен на этом устройстве и заранее загрузил queue.
- Offline login, генерация новой queue без сети и file import/export progress в фазе 08 не добавляются.
- Replay идёт через последовательные повторные вызовы `POST /review/submit`, без batch endpoint.
- Cached snapshots — это fallback для чтения; `settings/save` по-прежнему требует сеть.

## Проверки
- Backend:
  - `backend/tests/test_review.py`
  - миграция `review_log.client_event_id` входит в startup path.
- Frontend unit:
  - `frontend/src/shared/offlineStore.test.ts`
  - `frontend/src/shared/reviewSession.test.ts`
  - обновлены tests для `ReviewPage`, `DashboardPage`, `StatsPage`, `SettingsPage`, `DecksPage`, `DeckDetailPage`, `App`.
- E2E:
  - `frontend/tests/e2e/auth.spec.ts`
  - добавлен offline-review reconnect flow;
  - добавлен mobile viewport smoke.
