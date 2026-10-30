# Postman environments

> **Source**: DOC-011. Usage, origin rules and DEBUG-only values: [`../README.md` §2](../README.md#2-environments-doc-011).

| File | Name | `base_url` |
|---|---|---|
| [`local-console.json`](local-console.json) | Sharwa · local · console API | `http://localhost:8000` |
| [`local-platform.json`](local-platform.json) | Sharwa · local · platform origin | `http://localhost:8000` |
| [`local-store.json`](local-store.json) | Sharwa · local · store host | `http://noor.localhost:8000` |
| [`staging-console.json`](staging-console.json) | Sharwa · staging · console API | `https://<django-public-host>` |
| [`staging-platform.json`](staging-platform.json) | Sharwa · staging · platform origin | `https://<base>` |
| [`staging-store.json`](staging-store.json) | Sharwa · staging · store host | `https://<store>.<base>` |

Secret variables (`*_phone`, `*_password`, `console_username`) are empty on purpose: fill them in your local Postman only, and never commit them. `pos_manager_code_debug` and `otp_debug` exist only in the local files; they work only with Django `DEBUG=True`.
