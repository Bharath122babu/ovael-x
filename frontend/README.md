# ovael-x v5 React Workbench

Real same-origin React/Vite client for the FastAPI backend, not a backend simulator. From the project root, start FastAPI on 127.0.0.1:8000. Here run `npm install && npm run dev` and open http://127.0.0.1:5173.

`src/api.ts` handles CSRF/error/idempotency transport. `src/assessment.ts` normalizes answer types into backend submission parts. UI supports text, MCQ, boolean, numeric, code, OCR transcription confirmation, a drawing pad, optional browser ASR, course/topic creation, documents, sessions and proof-learning insights.

Run `npm run test:contracts` and `npm run build` after installation. OCR produces only text; topology/handwriting form and pronunciation are not auto-verified. User can edit and confirm OCR transcription. Browser ASR may be nonlocal.

The GitHub publication checks on 11 October 2026 passed all seven contract tests and the TypeScript + Vite production build. Browser end-to-end coverage and production deployment remain unverified.
