---
description: >-
  The web playground — a React/Vite SPA that formats Apex in the browser using
  the plugin's standalone build. Read this before changing anything under
  packages/playground.
paths:
  - packages/playground/**/*
---

# Playground

A React + Vite single-page app (deployed on Render) that lets users format Apex
in the browser and share snippets via URL.

- Entry/UI: `src/App.tsx`, `src/OptionEntry.tsx`, `src/Buttons.tsx`; shareable
  state is encoded in the URL hash (`src/urlHash.ts`).
- It consumes the plugin's **standalone UMD browser build**
  (`dist/src/standalone.umd.cjs`), not the Node entry — so it can't spawn the
  Java CLI or native binary. Browser parsing goes through the hosted HTTP
  serializer; the `Dockerfile` builds that server image for deployment.
- Because it runs in the browser, any plugin code reachable from the entry must
  stay browser-safe: Node built-ins (`node:fs`, `node:child_process`, etc.) are
  externalized in the UMD build and must not execute on the browser path.
- It rarely needs changes and is largely self-contained.
