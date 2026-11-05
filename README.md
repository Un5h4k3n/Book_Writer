# Book Writer

A browser-based writing workspace built with React, TypeScript, and Vite.

## Run locally

```sh
npm ci
npm run dev
```

Use `npm run build` for a production build.

Writing projects are stored in this browser using IndexedDB. Gemini settings,
including a user-entered API key, are saved in browser local storage. Use only a
trusted browser profile; do not share browser storage exports containing keys.
Ollama defaults to the local machine.

## Optional cloud sync

Without Firebase configuration, automatic cloud writes are skipped and writing
remains local. Copy `.env.example` to `.env.local` and fill in your own Firebase
web-app settings to enable cloud sync. Restart Vite after changing these values.
Never add server credentials or service-account keys to this frontend.

Vite includes `VITE_*` values in browser bundles. These settings are not an access
control system. This prototype has no Firebase user authentication or bundled
Firestore security rules; configure and review access controls for your own
project before connecting sensitive writing. Do not deploy it with open database
rules.

Keep manuscripts, imported documents, private exports, and real credentials out
of version control. `Test_Docs/` and local environment files are ignored.
