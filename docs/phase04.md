# Фаза 04 — Движок визуализации на `react-konva`

## Статус
- [x] Фаза реализована в коде и синхронизирована с документацией.

## Цель
Добавить чистый frontend-движок, который процедурно рендерит яхтенные сцены из `diagram_spec`, поддерживает минимальную интерактивность для будущих карточек и не требует изменений backend API.

## Что сделано

### 1. Новый feature-модуль диаграмм
- [x] Добавлен `frontend/src/features/diagram/` как отдельный frontend feature-блок.
- [x] Добавлен `DiagramStage` как stateless Konva-компонент с контрактом `spec`, `width`, `height`, `rotatableBoatId?`, `onBoatRotate?`, `onBoatTap?`.
- [x] Добавлен `ResponsiveDiagram`, который измеряет контейнер через `ResizeObserver`, парсит raw `diagram_spec` и передаёт размеры в `DiagramStage`.
- [x] Добавлены примитивы `WindArrow`, `BoatShape`, `SailGroup`, `MarkBuoy`, `OverlayLayer`.

### 2. Typed `DiagramSpec`
- [x] Зафиксирован frontend-only тип `DiagramSpec` версии `1`.
- [x] Поддерживается единая world coordinate system `1000 x 700`.
- [x] Поддерживаются поля `wind`, `boats`, optional `mark`, optional `overlays`.
- [x] `ReviewCard.diagram_spec` по wire остаётся JSON-объектом; строгая типизация включается через `parseDiagramSpec(...)`.
- [x] Для невалидного raw payload используется controlled fallback с сообщением об ошибке, без падения UI.

### 3. Геометрия и рендеринг MVP
- [x] Галс вычисляется из `heading_deg` и `wind.direction_deg`, а не хранится в JSON отдельно.
- [x] Цвет корпуса зависит от галса: `starboard = green`, `port = red`, `head-to-wind = slate`.
- [x] Добавлены pure helpers для нормализации углов, кратчайшей разницы углов, вычисления галса, auto sail angles, sail state и viewport scale-to-fit.
- [x] Поддерживаются `main`, optional `jib`, optional `gennaker`.
- [x] Не добавлялись apparent wind, анимации, zoom/pan и интерактивные trim-handles.

### 4. Минимальная интерактивность
- [x] Если передан `rotatableBoatId`, для этой лодки рендерится круговой drag-handle.
- [x] `onBoatRotate(boatId, headingDeg)` возвращает нормализованный угол `0..359`.
- [x] `onBoatTap(boatId)` вызывается по tap/click на корпус лодки.
- [x] Интерактивность ограничена будущими сценариями `directional` и `right_of_way`.

### 5. Preview без новых маршрутов
- [x] Главная страница использует `ResponsiveDiagram` с демонстрационной сценой.
- [x] Phase04 не меняет backend, review API и не добавляет новые routes.

## Зафиксированные контракты

### `DiagramSpec`
- [x] `version: 1`
- [x] `wind: { direction_deg, speed_knots? }`
- [x] `boats[]: { id, x, y, heading_deg, label?, highlight?, sails }`
- [x] `sails.main` обязателен, `sails.jib` и `sails.gennaker` optional
- [x] `mark?: { x, y, zone_radius }`
- [x] `overlays?: { keep_clear_boat_id?, windward_boat_id?, leeward_boat_id?, overlap_pairs? }`

### `DiagramStage`
- [x] Принимает уже typed `spec`.
- [x] Не содержит внутреннего состояния сцены.
- [x] Масштабирует world canvas в фактический контейнер через viewport transform.

### `ResponsiveDiagram`
- [x] Принимает raw `diagramSpec: Record<string, unknown>`.
- [x] Сам парсит JSON в `DiagramSpec`.
- [x] При невалидной структуре показывает fallback вместо canvas.

## Тесты фазы
- [x] Добавлен `frontend/src/features/diagram/diagramHelpers.test.ts`.
- [x] Добавлен `frontend/src/features/diagram/DiagramStage.test.tsx`.
- [x] `vitest.setup.ts` расширен общим mock для `ResizeObserver`.

## Проверки фазы
- [x] Проверены pure helpers: углы, галсы, автоуглы парусов, luffing и viewport transform.
- [x] Проверен stage render для одной и двух лодок, знака и keep-clear overlay.
- [x] Проверены callbacks `onBoatTap` и `onBoatRotate`.
- [x] Проверен controlled fallback для невалидного raw `diagram_spec`.
- [x] `npm run build`
- [x] `make test`
- [x] Живая browser-проверка: preview-сцена рендерится на главной без console/network ошибок.

## Примечания для следующих фаз
- Фаза 05 использует готовые `ResponsiveDiagram` и `DiagramStage` для review UI, не меняя backend.
- В phase04 движок остаётся deterministic и stateless: он рисует только то, что описано в `DiagramSpec`.
- Более сложная интерактивность, анимации ответа и zoom/pan остаются задачами следующих фаз.
