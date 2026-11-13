# Запуск и публикация DealPilot

DealPilot — статическая демонстрационная CRM. Сервер базы данных, платные API и постоянный VPS не требуются. Публикация исходников на GitHub и размещение работающего приложения — отдельные действия. Публичное демо в рамках этой проверки не развёртывалось.

## Локальный запуск

Установите Node.js 22.12+ или 24, затем выполните из корня проекта:

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

Откройте `http://127.0.0.1:5173`. На Windows также доступны `start.cmd` и `start.ps1`. Portable Node в `.tools/` используется только при наличии и не входит в Git.

## Production-сборка

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run preview -- --port 4173 --strictPort
```

Сборка находится в `dist/`; локальный просмотр — `http://127.0.0.1:4173`. Для E2E по умолчанию нужен установленный Microsoft Edge. Не открывайте `dist/index.html` через `file://`.

Если позже потребуется статический хостинг, он должен обслуживать `dist/` по HTTPS. Текущая конфигурация Vite рассчитана на корень домена. Для вложенного пути вида `/Dealpilot/` сначала задайте соответствующий Vite `base` и проверьте ресурсы по этому пути. Исходники, `.tools/`, `node_modules/`, резервные копии и журналы не являются содержимым сайта.

## Хранение и ограничения

Записи хранятся в localStorage, а SHA-256 версии — в IndexedDB. Для сохранения нужны Web Locks, IndexedDB и безопасный контекст HTTPS/localhost. Облачного backend, аккаунтов, командной синхронизации и платежей нет.

Данные привязаны к origin: другой домен, протокол или порт означает другое хранилище. Для переноса используйте JSON-экспорт и подтверждённый импорт. Лимит — 3 МиБ UTF-8; CSV предназначен для таблиц, а не полного восстановления связей. Используйте вымышленные данные.

## GitHub

Репозиторий: [Forunell/Dealpilot](https://github.com/Forunell/Dealpilot). Существующая рабочая ветка — `portfolio/verified-2026-11-11`. Порядок проверки и публикации описан в [GIT_PREPARATION](docs/GIT_PREPARATION.md), результаты — в [VALIDATION](docs/VALIDATION.md).

Рекомендуемый About:

> Local-first demo CRM built with React and TypeScript: contacts, Kanban deals, tasks, currency-aware KPIs, JSON backups and CSV export. No cloud backend.

Рекомендуемые Topics: `crm`, `react`, `typescript`, `vite`, `kanban`, `localstorage`, `local-first`, `demo`, `portfolio`.
