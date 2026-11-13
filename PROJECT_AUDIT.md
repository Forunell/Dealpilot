# PROJECT AUDIT — DealPilot

## Перевірка та публікація 2026-11-12–13

Робота виконана тільки в `D:\proek\DEALPILOT`, remote — `Forunell/Dealpilot`, на існуючій гілці `portfolio/verified-2026-11-11`. Підготовлені раніше виправлення збережено. Власник дозволив commit/push і fast-forward оновлення `main`; старі примітки нижче про очікування дозволу описують попередній аудит.

Додатково виправлено JSON-експорт: форматування з відступами могло збільшити резервну копію понад ліміт імпорту 3 МиБ. Компактний JSON зберігає всі поля. Нова браузерна регресія експортує і відновлює 1 800 контактів із нотатками поблизу ліміту. Оновлено інструкції запуску, версії технологій та Git-документацію; DEPLOYMENT тепер стосується лише DealPilot. Обкладинку та корисні скриншоти збережено, браузерні тести оновили чотири знімки реального інтерфейсу.

Актуальні команди, результати та обмеження — у [VALIDATION](docs/VALIDATION.md). Публікація вихідного коду не означає розгортання публічного демо. Нижче збережено історію попередньої перевірки.

Дата: 2026-11-10–11. Джерело: існуюча локальна папка `DEALPILOT`; GitHub-метадані репозиторію перевірені через підключений GitHub. Початкова робоча папка не мала `.git`. 11.11.2026 створено окремий клон GitHub, виконано status/branch/remote і порівняння з `main` на `0c166a704fedb1f164237c75c68d4838f380b0cf`. Підготовлена локальна гілка `portfolio/verified-2026-11-11`. Віддалених змін не виконано; докладніше — [підготовка Git](docs/GIT_PREPARATION.md). Перед змінами збережені вихідні файли та SHA-256 у `../portfolio-audit/`.

## Стек і реалізація

React 19, TypeScript, Zod, Vite, localStorage, Web Locks, IndexedDB (відбиток версії).

- Контакти, угоди, шість стадій Kanban, завдання, пошук і фільтри.
- KPI, прогноз і виграні суми окремо для UAH/USD/EUR; без конвертації.
- JSON-копії/імпорт із перевіркою зв’язків, CSV, контроль конфліктів вкладок і підтверджене відновлення.

## Знахідки та виправлення

| Пріоритет | Виявлено | Зроблено |
|---|---|---|
| P0 | Порівняння localStorage перед записом не було атомарним; повторний тест виявив втрату однієї з одночасних змін. | Web Locks + транзакційна перевірка SHA-256 версії в IndexedDB, очікування результату в UI. Відхилена дія залишає форму відкритою. |
| P2 | Контакти розширювали документ на 390 px через абсолютну sr-only підпис колонки. | Контейнер таблиці position:relative; горизонтальна прокрутка залишається всередині таблиці. |
| P1 | Новий контроль версії потребував узгодженого очищення при відновленні. | Підтверджене очищення скидає дані та маркер під однією блокировкою; є браузерна регресія. |
| P0 | npm audit виявив High advisory GHSA-mrhx-c7xc-m3w5 у Zod 3. | Точкове оновлення до Zod 4.6.7; API перевірки згоди адаптований; повторні тести та audit. Джерело: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 |
| P0 | Повний npm audit виявив Critical advisory у tinypool та попередження @vitest/mocker в тестовому оточенні. | Vitest оновлено до 4.1.12; tinypool більше не входить у дерево. Повторні unit, lint і build проходять. Деталі: docs/DEPENDENCY_SECURITY.md. |
| P2 | Транзитивний minimatch у TypeScript ESLint мав advisory про виснаження ресурсів. | Вузький override тільки для typescript-estree на minimatch 11.0.1; сумісність перевірено лінтером. Повний npm audit: 0 advisories. |

P0 — безпека/ризик втрати даних; P1 — основна функція; P2 — другорядна функція/інтерфейс; P3 — документація/оформлення.

## Обсяг повторної перевірки

CRUD контактів/угод/задач, drag/select Kanban, KPI/валюти/періоди, пошук, сортування, пагінація, JSON validation/import/cancel/recovery, CSV, quota failure, cross-tab conflict; окремо одночасні writers, corrupted-storage recovery після маркера, contacts overflow. 390/768/1440 px та додаткові розміри в наявних тестах.

| Перевірка | Результат | Свідчення |
|---|---|---|
| build-typecheck | PASS | exit 0 — [validation summary](docs/VALIDATION.md) |
| e2e | PASS | exit 0 — [validation summary](docs/VALIDATION.md) |
| lint | PASS | exit 0 — [validation summary](docs/VALIDATION.md) |
| npm-audit-all | PASS | exit 0 — [validation summary](docs/VALIDATION.md) |
| npm-audit | PASS | exit 0 — [validation summary](docs/VALIDATION.md) |
| unit | PASS | exit 0 — [validation summary](docs/VALIDATION.md) |

Планові набори: 27 unit, 19 E2E після доданих регресій, ESLint, TypeScript + production build; п’ять повторів concurrency/contacts сценаріїв. Перевірка production-залежностей npm audit --omit=dev. Повний npm audit (включно dev): 0 advisories.

## Обмеження й неперевірене

Записи зберігаються в localStorage; IndexedDB містить тільки SHA-256 відбиток поточної версії для узгодження запису. Потрібні Web Locks, IndexedDB та HTTPS/localhost. При конфлікті друга дія відхиляється, автоматичного злиття немає. Немає сервера, справжніх акаунтів, командної синхронізації чи CSV-імпорту. Ліміт JSON 3 МБ. Не редагуйте localStorage вручну: невідповідність відбитка блокує запис; збережіть оригінал і використайте підтверджене відновлення.

Браузерні перевірки виконані в Microsoft Edge/Playwright; Safari, Firefox, фізичні телефони та ручний screen-reader аудит не виконувались. Публічна інфраструктура і реальні платежі не тестувалися. Python pip check перевіряє сумісність встановлених пакетів, а не повну відсутність CVE. Наявні deprecation warnings залежностей зазначені в логах. Масового оновлення залежностей не було.

## Артефакти та передача

- `../portfolio-export/dealpilot/`: обкладинка й 3 PNG; повні оригінали в `originals/`.
- `../portfolio-export/IMAGE_PROVENANCE.json`: джерела, SHA-256 і точні прямокутники кадрування.
- `../portfolio-export/CHANGED_FILES.md`: повний список змінених/нових файлів.
- README скорочено; докладний попередній текст з робочими відносними посиланнями збережено у `docs/TECHNICAL_GUIDE.md`.
- Перевірено `.gitignore`: credential-файли, SQLite, runtime та кеші виключені. Секрети й робочі бази не читалися і не змінювалися.
- Commit, push, публікація й live Telegram не виконувались. Перед ними потрібне окреме підтвердження власника.

## Повторна підготовка GitHub, 11.11.2026

Вихідний код зіставлений з поточною віддаленою гілкою; робочі зміни збережено. Сирі логи збережені локально в ігнорованій `docs/audit-evidence/`; до Git включено стислий `docs/VALIDATION.md`. Загальний експорт Freelancehunt та резервні копії залишаються окремими локальними матеріалами і не потрібні для запуску цього репозиторію.

Повторний запуск саме з Git-копії:

| Перевірка | Результат | Лог |
|---|---|---|
| build-typecheck | PASS | [validation summary](docs/VALIDATION.md) |
| e2e | PASS | [validation summary](docs/VALIDATION.md) |
| lint | PASS | [validation summary](docs/VALIDATION.md) |
| unit | PASS | [validation summary](docs/VALIDATION.md) |
