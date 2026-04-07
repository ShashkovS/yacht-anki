# Фаза 05 — UI повторения, колоды и рабочая навигация

## Статус
- [x] Фаза реализована в коде и синхронизирована с документацией.

## Цель
Собрать пользовательский frontend поверх уже готовых backend API, FSRS-модуля и движка диаграмм: дать рабочие страницы дашборда, повторения, колод и защищённой навигации, не меняя backend-контракты.

## Что сделано

### 1. Роутинг и навигация приложения
- [x] Публичная landing page сохранена на `/`.
- [x] `DashboardPage` оставлен на `/dashboard`.
- [x] Добавлены защищённые маршруты `/review`, `/decks`, `/decks/:slug`, `/stats`, `/settings`.
- [x] `LoginPage` остаётся публичной и редиректит авторизованного пользователя в `/dashboard`.
- [x] В общем header для авторизованного пользователя появились прямые ссылки `Кабинет`, `Повторение`, `Колоды`, `Статистика`, `Настройки`.

### 2. Рабочий дашборд
- [x] `frontend/src/pages/DashboardPage.tsx` загружает `POST /review/summary`.
- [x] Показаны `due_count`, `new_count`, `streak_days`, `studied_cards_count`.
- [x] `deck_progress[]` выводится в виде компактных карточек с переходом в колоду.
- [x] Добавлены CTA `Начать повторение` и `Открыть колоды`.
- [x] При пустой очереди показывается empty state `На сегодня всё`.

### 3. Review flow на `/review`
- [x] `frontend/src/pages/ReviewPage.tsx` использует `loadReviewSession(...)` и `submitCurrentReview(...)`.
- [x] Поддержан optional deck filter через query param `/review?deck=<slug>`.
- [x] Реализован цикл `загрузка → вопрос → показать ответ → выбрать FSRS rating → следующая карточка`.
- [x] Под кнопками `Не помню / Сложно / Хорошо / Легко` показываются preview-интервалы.
- [x] При пустой очереди показывается завершённый экран с возвратом в кабинет или в детальную страницу колоды.

### 4. Страницы колод
- [x] `frontend/src/pages/DecksPage.tsx` использует `POST /decks/list`.
- [x] `frontend/src/pages/DeckDetailPage.tsx` использует `POST /decks/get` и `POST /cards/list`.
- [x] На detail page показывается список карточек и статус `Новая`, `Изучается`, `На повторении`.
- [x] Кнопка `Учить эту колоду` ведёт на `/review?deck=<slug>`.

### 5. Phase05-шаблоны карточек
- [x] `diagram_spec` расширен frontend-only полями `answer_scene?` и `expected_answer?` без изменений backend API.
- [x] `term_definition` работает как reveal-only карточка.
- [x] `directional` использует поворот лодки через `rotatableBoatId`.
- [x] `trim` использует выбор из вариантов ответа через кнопки.
- [x] `manoeuvre` показывает шаги после reveal.
- [x] `right_of_way` использует tap по лодке и показывает правильный выбор после reveal.
- [x] Если `expected_answer` или `answer_scene` отсутствуют, UI не падает и остаётся reveal-only.

### 6. Placeholder pages
- [x] Добавлены `Статистика` и `Настройки` как защищённые заглушки.
- [x] Текст явно фиксирует, что реальные экраны появятся в фазе 07.

## Зафиксированные frontend-контракты

### Роуты
- [x] `/` — публичный landing.
- [x] `/login` — публичный login.
- [x] `/dashboard`, `/review`, `/decks`, `/decks/:slug`, `/stats`, `/settings` — только для авторизованного пользователя.

### Deck и summary payloads
- [x] Используются существующие backend endpoints `POST /review/summary`, `POST /decks/list`, `POST /decks/get`, `POST /cards/list`.
- [x] На фронтенде зафиксированы типы `ReviewSummary`, `DeckListItem`, `DeckDetail`, `DeckProgress`.

### Review templates
- [x] `ExpectedAnswer` поддерживает `rotate_heading`, `choose_option`, `select_boat`, `reveal_steps`.
- [x] `parseDiagramSpec(...)` остаётся точкой нормализации raw `diagram_spec` в typed scene.
- [x] `answer_scene` используется как optional answer view без изменения wire shape карточки.

## Тесты фазы
- [x] Обновлён `frontend/src/app/App.test.tsx` под новые protected routes и login redirect.
- [x] Обновлён `frontend/src/pages/DashboardPage.test.tsx` для summary и empty state.
- [x] Добавлен `frontend/src/pages/ReviewPage.test.tsx`.
- [x] Добавлен `frontend/src/pages/DecksPage.test.tsx`.
- [x] Добавлен `frontend/src/pages/DeckDetailPage.test.tsx`.
- [x] Добавлен `frontend/src/features/review/ReviewCardView.test.tsx`.
- [x] Добавлен `frontend/src/features/diagram/parser.test.ts`.
- [x] Обновлён Playwright flow `frontend/tests/e2e/auth.spec.ts` под dashboard, review, decks, placeholders и auth redirects.

## Проверки фазы
- [x] `npm run test`
- [x] `npm run build`
- [x] `make test`
- [x] Живая browser-проверка маршрутов, login/logout, dashboard, review и deck-scoped review

## Примечания для следующих фаз
- Фаза 05 не меняет backend, БД и миграции: все правила answer UI живут только на фронтенде.
- FSRS rating остаётся ручным: пользователь сам выбирает `Again/Hard/Good/Easy`, correctness не пересчитывает rating автоматически.
- В фазе 06 можно добавлять реальный предметный контент в `diagram_spec` постепенно: phase05 UI уже умеет корректно деградировать до reveal-only карточек.
