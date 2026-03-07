# Frontend Agent Notes

- This frontend is for students, so keep flows obvious and easy to inspect in the browser.
- Keep components small and readable.
- Use plain React state and small hooks.
- Keep auth flow explicit: login, load current user, logout, refresh.
- Prefer simple pages over generic abstractions.
- Keep all text in simple English for B2-level students.
- Add frontend unit tests for new UI states, route guards, forms, and client-side helpers.
- Add or update Playwright tests when a feature changes login, routing, API wiring, cookies, or any flow a real user clicks through.
- After frontend changes, open the live app and exercise the changed flow in a real browser session.
- Check browser console and network requests for uncaught errors, 4xx/5xx responses, bad cookies, and broken WebSocket connections.
- Do not rely on Vitest or Playwright alone when the task changes auth, routing, startup, or browser-only behavior.
- Start each frontend source file with a short simple-English comment that says what the file does, when to edit it, and whether it can be copied for a new page, component, hook, or test.
