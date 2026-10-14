# OVAEL-X learner workspace

React 18 / TypeScript / Vite client for the FastAPI backend. Start the backend on `127.0.0.1:8000`, then run `npm ci` and `npm run dev` here. Open http://127.0.0.1:5173. Vite proxies the authenticated API and official MCP transport to the backend.

The single app entry is `src/main.tsx` -> `src/App.tsx` -> `components/OvaelApp.tsx`. Learners have Chat, Courses, Materials, Progress, and Settings. Progress contains gap guidance, topic maps, skill evidence, and conversation receipts. Teacher course management uses the same authenticated services. The retired workbench and alternate frontend component trees are not part of the application.

Chat supports typed answers, reviewed image/audio transcripts, drawing, Markdown, Mermaid, math, visual steps, charts, and read-only code examples. Live microphone input uses MediaRecorder and the backend STT adapter; it does not use browser ASR. Uploaded files appear in Materials. Course creation works without files.

Run `npm test` and `npm run build`. Deterministic assessment contracts, cookie refresh, answer completeness, pending-turn recovery, diagram safety, and visual bounds are covered by contract tests. Local browser verification and provider limitations are documented in `../docs/reviews/2026-10-14/visual-teaching.md`.

The synthetic demo uses **Bharat / OVAEL-demo-2026!** on loopback only. Teaching, OCR, speech, and media need working backend providers/runtimes. A configured adapter or a passing test with a mock is not proof of a working live integration.
