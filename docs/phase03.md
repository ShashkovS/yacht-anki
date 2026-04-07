# Фаза 03 — Интеграция FSRS и фронтенд-сессии повторения

## Статус
- [x] Фаза реализована в коде и синхронизирована с документацией.

## Цель
Подключить `ts-fsrs` на фронтенде, научить приложение загружать пользовательские настройки повторения, локально пересчитывать следующее состояние карточки и отправлять результат в существующий backend review API.

## Что сделано

### 1. Типы review-домена на фронтенде
- [x] `frontend/src/shared/types.ts` расширен типами `ReviewRating`, `CardPhase`, `FsrsState`, `ReviewCard`, `ReviewQueueItem`, `UserSettings`.
- [x] FSRS storage-shape зафиксирован в явном виде с ISO-датами и полями `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `learning_steps`, `reps`, `lapses`, `state`, `due`, `last_review`.

### 2. Чистая обёртка над `ts-fsrs`
- [x] Добавлен `frontend/src/shared/fsrs.ts`.
- [x] `createScheduler(desiredRetention)` использует `enable_fuzz: false` для детерминированных тестов.
- [x] `createNewFsrsState(now)` создаёт стартовое FSRS-состояние в app storage shape.
- [x] `scheduleReview(...)` локально считает следующее состояние, фазу и `due_at`.
- [x] `previewNextReviews(...)` возвращает четыре preview-варианта для `Again`, `Hard`, `Good`, `Easy`.
- [x] `formatNextReview(...)` возвращает короткую русскую строку для ближайшего интервала.

### 3. Plain review-session слой
- [x] Добавлен `frontend/src/shared/reviewSession.ts` как чистый модуль без React hook.
- [x] `loadReviewSession({ deckSlug? })` параллельно вызывает `POST /settings/get` и `POST /review/queue`.
- [x] Сессия хранит queue items, summary, current index, session stats и preview для текущей карточки.
- [x] `submitCurrentReview(...)` локально пересчитывает FSRS, отправляет `POST /review/submit` и переключает сессию на следующую карточку.

### 4. Минимальное изменение backend wire contract
- [x] Logged-in ответы `POST /cards/list` и `POST /review/queue` теперь возвращают `state.fsrs_state` для уже изучавшихся карточек.
- [x] Для новых карточек `state` по-прежнему равно `null`.
- [x] Новые endpoints в фазе 03 не добавлялись.

## Зафиксированные контракты

### Frontend FSRS state
- [x] `FsrsState` хранит весь card-like payload, который нужен для продолжения расписания между сессиями.
- [x] Даты в `due` и `last_review` нормализуются до ISO-строк.

### Payload карточки для logged-in пользователя
- [x] `state` имеет форму `null | { phase, due_at, last_reviewed_at, fsrs_state }`.
- [x] `fsrs_state` приходит как JSON-object, а не как сырая строка из SQLite.

### Review submit
- [x] Request shape `POST /review/submit` остаётся прежним: `card_id`, `rating`, `fsrs_state`, `phase`, `due_at`, `elapsed_ms`.
- [x] Бэкенд в фазе 03 только расширяет read payloads и не меняет смысл review endpoints.

## Тесты фазы
- [x] Добавлен `frontend/src/shared/fsrs.test.ts`.
- [x] Добавлен `frontend/src/shared/reviewSession.test.ts`.
- [x] Обновлён `backend/tests/test_cards.py` для проверки `state.fsrs_state`.
- [x] Обновлён `backend/tests/test_review.py` для проверки `state.fsrs_state` в review queue.

## Проверки фазы
- [x] FSRS helper работает детерминированно на фиксированных timestamp.
- [x] `desired_retention` влияет на интервал review-карточки.
- [x] Review-session слой загружает очередь, считает submit локально и переключает current item.
- [x] Backend read payloads возвращают полный `fsrs_state` для already-reviewed cards.
- [x] `make test`

## Примечания для следующих фаз
- Фаза 03 не добавляет review page и не меняет роутинг; UI повторения остаётся задачей фазы 05.
- Review-session логика уже вынесена в чистый shared module, чтобы дальше использовать её и в page, и в unit tests без state manager.
- В фазе 05 можно подключать существующие `review/queue`, `review/submit`, `settings/get` без переделки API.
