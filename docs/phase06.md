# Фаза 06 — Встроенный контент колод и карточек

## Summary
Цель фазы 06: перевести приложение с пустого каркаса на реальный встроенный учебный каталог. После этой фазы при любом старте приложения в БД идемпотентно загружаются 3 builtin-колоды и 65 builtin-карточек из файлов репозитория, а UI phase05 начинает работать на штатном контенте без route-моков.

## Реализация
- В `backend/db/seed.py` сидинг разделён на два явных шага:
  - `seed_builtin_content(...)` вызывается всегда.
  - `seed_dev_users(...)` вызывается только в `mode=dev`.
- Источник правды для контента теперь файловый:
  - `content/terms.json`
  - `content/manoeuvres.json`
  - `content/right-of-way.json`
- Загрузка каталога живёт в `backend/db/builtin_content.py`.
- Startup использует `seed_startup_data(...)`, а не старый dev-only seed.
- Для стабильного upsert builtin-карточек добавлена forward-only миграция `backend/migrations/010_add_card_slug.py`.

## Внутренний формат контента
- deck:
  - `slug`
  - `title`
  - `description`
  - `builtin`
  - `cards[]`
- card:
  - `slug`
  - `template_type`
  - `prompt`
  - `answer`
  - `explanation`
  - `diagram_spec`
  - `tags`
  - `sort_order`

## DiagramSpec
Все карточки используют текущий frontend-compatible `DiagramSpec v1` из phase04–05:
- `version: 1`
- `wind.direction_deg`
- `boats[]` с `id`, `x`, `y`, `heading_deg`, `sails`
- optional `mark`
- optional `overlays`
- optional `answer_scene`
- optional `expected_answer`

Поддерживаемые `expected_answer` в builtin-контенте:
- `rotate_heading`
- `choose_option`
- `select_boat`
- `reveal_steps`

Устаревший формат вида `boat_a` / `twd_deg` в phase06 больше не используется.

## Каталог колод
- `terms`: 30 карточек
  - курсы к ветру
  - приведение и уваливание
  - галсы и стороны
  - базовые органы управления и trim vocabulary
- `manoeuvres`: 15 карточек
  - работа с гротом при изменении курса
  - оверштаг и фордевинд
  - постановка и уборка генакера
  - traveller, mainsheet, fine tune, сильный ветер
- `right-of-way`: 20 карточек
  - правила 10, 11, 12, 13, 14, 16, 18
  - overlap
  - clear ahead / astern
  - mark-room scenes с buoy и zone

Итоговый builtin-пакет: ровно 65 карточек.

## Upsert и стабильность данных
- Публичные API не менялись:
  - `decks/*`
  - `cards/list`
  - `review/*`
  - `settings/*`
- Numeric `card_id` остаётся публичным идентификатором.
- Внутри БД builtin-карточки стабилизируются через `cards.slug`.
- Уникальность фиксируется по `(deck_id, slug)`.
- Seed:
  - обновляет существующие builtin-карточки по stable slug;
  - вставляет отсутствующие;
  - не удаляет старые записи автоматически, чтобы не ломать пользовательский прогресс.

## Проверки
- Backend:
  - startup в чистой БД даёт 3 колоды и 65 карточек
  - повторный seed не создаёт дубликаты
  - обновление JSON обновляет карточку по slug
  - duplicate card slug внутри одной колоды даёт понятную ошибку
- Frontend:
  - тест проходит по всем builtin JSON-файлам и парсит каждый `diagram_spec`
  - smoke-render прогоняет builtin-карточки через `ReviewCardView` в unrevealed/revealed режимах
- E2E:
  - browser-flow больше не опирается на route-моки
  - проверяется реальный seeded-контент: login, dashboard, decks, deck detail, review, placeholders, logout

## Completion Checklist
- [x] builtin-каталог хранится в repo JSON-файлах
- [x] startup seed загружает builtin-контент во всех средах
- [x] dev-пользователи сидируются отдельным шагом
- [x] добавлена миграция `cards.slug`
- [x] в БД появляются 3 builtin-колоды и 65 карточек
- [x] карточки валидны для текущего `DiagramSpec v1`
- [x] UI phase05 работает на реальных данных
- [x] tests покрывают seed, parser integrity и живой seeded browser flow
