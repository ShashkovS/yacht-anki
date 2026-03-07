# Template PWA Agent Notes

- The main user of this template is a school student who does not understand the technology deeply yet.
- Keep the template small and easy to read.
- Prefer the simplest working design over clever abstractions.
- Prefer explicit functions, explicit SQL, and explicit routes.
- Do not add heavy frameworks or hidden magic.
- Keep all user-facing text in simple English.
- When adding backend DB code, place SQL only under `backend/db`.
- When adding frontend pages, keep routing and auth flow direct and beginner-friendly.
- Cover new behavior densely with tests: backend unit tests, frontend unit tests, and Playwright e2e tests where the
  feature crosses the browser boundary.
- For auth, routing, cookies, WebSockets, startup, and other browser-sensitive flows, do not stop at tests. Also verify
  the real running app in a live browser session.
- After frontend, auth, routing, cookie, or WebSocket changes, verify the result in a live browser session, not only
  with tests.
- During that live check, look for browser console errors, failed network requests, cookie problems, and broken
  redirects before calling the task done.
- When local dev servers are already running, prefer checking the real dev app first and use tests as a second line of
  verification.
- Every source file should start with a short plain-English header comment or docstring that explains what the file
  does.
- That file header should also say when the file should be edited, and whether it can be copied as a starting point for
  adding a new table, endpoint, page, test, or similar feature.
