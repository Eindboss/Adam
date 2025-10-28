
# Patch notes (global review -> applied)

**Key fixes & improvements**
1. XSS hardening in week view (no innerHTML for user data) — `app.ui.render.patched.js`.
2. Drag & Drop listeners deduplicated per column — `app.ui.render.patched.js`.
3. Local date formatting to avoid UTC off-by-one — `app.core.patched.js` (`fmtISO`).
4. Richer search (title, notes, type, dueDate) and weekly minutes in stats — `app.core.patched.js` and `app.ui.render.patched.js`.
5. ARIA/tab a11y with roving tabindex & keyboard support — `app.ui.render.patched.js`.
6. Modals: focus title on open; Esc to close (task & quick) — `app.ui.forms.patched.js`.
7. Clear-done confirmation — `app.ui.events.patched.js`.
8. Theme persistence (light/dark) — `theme.patched.js`.

**How to try**
- In `index.html`, replace script tags that load the original files with the `*.patched.js` equivalents (keep `app.boot.js` as-is).
- Ensure there is a button with id `theme-toggle` if you want to use the theme toggle handler.
