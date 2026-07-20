# DentiScribe AI — Project State

A local-first transcript-formatting tool for dental practices. The dentist records or pastes a transcript of an encounter; the app transcribes (if needed), reformats it into the dentist's own preferred clinical-note style, and the dentist copies the result into their EHR (EXACT) themselves. Electron (main process) + Next.js/Tailwind (renderer, static-exported), TypeScript throughout.

## Scope (as of 2026-07-20 — read this before assuming anything is missing)

This app does **not** persist patient data, and does **not** integrate with any EHR. That's a deliberate, explicit decision, not an oversight:

- The dentist already copies the formatted output into EXACT (or any other EHR) by hand — no API integration or keyboard-wedge automation is needed or wanted.
- The app never stores a patient record, encounter, transcript, or note after the session — everything is processed in memory for one formatting request and discarded once the dentist copies the result out. There is no `patients`/`encounters`/`transcripts`/`soap_notes` table.
- The only things persisted locally, ever: **user accounts** (to gate access to the tool) and a **small set of style-example notes** the dentist supplies so output matches their preferred formatting. See `style_examples` in the schema.
- No RBAC/multi-role system, no append-only audit log — both existed in an earlier, larger version of this project (see History below) and were cut because there's no patient data model left to gate access to or audit operations against. A session still gates every IPC call; it just doesn't check a permission matrix anymore.

**Style learning is few-shot prompting, not fine-tuning.** More example notes can be added at any time (`src/main/db/repositories/styleExamplesRepo.ts`) and are included as prompt context on every formatting request (`src/main/ai/formatting/noteFormatter.ts`). There is no training pipeline, no model artifacts, no GPU requirement beyond what the chosen LLM provider already needs.

### History: what got cut and why

An earlier pass of this project built a much larger architecture: a full patient/encounter/SOAP-note/perio-chart/billing-claim data model, RBAC with 4 roles, a hash-chained append-only audit log, and a dual-path EHR integration layer (official APIs for Open Dental/Dentrix/Eaglesoft/EXACT, plus a keyboard-wedge fallback that simulates OS keystrokes into whatever field has focus). That work is gone from the codebase — deleted, not just deprecated — once the actual requirement turned out to be much narrower (format a transcript, nothing more). If you're wondering why patterns like `EhrConnector`, `withAuth`'s permission checks, or `appendAuditEntry` aren't here anymore: they were real, they worked, and they were removed on purpose when the scope changed. Don't rebuild them without a concrete new requirement driving it.

## Cost Model: Zero Cost by Default, Provider-Agnostic

The STT and LLM layers are built against provider-agnostic interfaces (`TranscriptionProvider`, `LlmProvider` — see Architecture Notes), not hardcoded to any vendor. **Local models are the default** so the app never generates a bill out of the box; cloud providers exist as optional, user-enabled swaps behind the same interface.

| Layer | Default (free) | Optional cloud swap (opt-in, needs an API key) |
|---|---|---|
| Speech-to-text | `local-whisper` — whisper.cpp subprocess, runs on the practice's own CPU/GPU | `deepgram` (Nova-2, ~$0.0043/min) or `openai-whisper` (Whisper API) |
| Note formatting | `ollama` — local HTTP server (`localhost:11434`), e.g. Llama 3 or Mistral | `claude` (Anthropic Messages API) or `openai` (Chat Completions API) |

Trade-off accepted knowingly with the default (local) choice: local Whisper and a local LLM are noticeably less accurate on noisy in-office audio and clinical writing than Deepgram/Claude. Expect more manual correction unless a cloud provider is switched on.

**The cloud-provider consent gate still matters even though there's no patient database.** `src/main/ai/cloudConsent.ts`'s `assertCloudProviderConsent()` blocks construction of any cloud STT/LLM provider until `cloudProviderConsentAcknowledged` is explicitly set. This isn't about data *at rest* (there is none) — it's about data *in transit*: the moment a cloud provider is enabled, a live patient's audio/transcript is sent to that vendor for processing, which is a real PHI disclosure requiring a BAA regardless of whether the app itself persists anything.

## Prerequisites

Node.js **is installed** (v24.18.0, via `winget install OpenJS.NodeJS.LTS`) and **Visual Studio Build Tools 2022 with the "Desktop development with C++" workload is installed** (`winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"`, run elevated). Both are now satisfied on this machine — `npm install` (no `--ignore-scripts` needed) completes cleanly: `better-sqlite3-multiple-ciphers` compiles from source via `node-gyp` against the new MSVC toolchain, `argon2` uses its bundled `win32-x64` prebuild, and Electron's own binary downloads normally. **The app has been launched end-to-end and confirmed working** — see Verification below.

Two practical gotchas hit during setup, worth knowing if this needs redoing on another machine:
- A freshly-installed winget package doesn't appear in an already-running shell's `PATH` — a new PowerShell session needs `$env:Path` rebuilt from the Machine+User registry values (or just fully restarted) before `node`/`npm` resolve.
- The Build Tools installer needs a genuinely elevated (Administrator) process — a non-elevated `winget install` attempt for it fails with exit code 1602. `Start-Process -Verb RunAs` works if the account is an actual Administrator (UAC will prompt for confirmation if elevation isn't otherwise pre-approved in the session).

Still needed before the AI layers actually work end-to-end (not yet installed on this machine):
- **Ollama** installed locally (for the local LLM) with a model pulled (e.g. `ollama pull llama3`).
- A `whisper.cpp` build, plus a downloaded `ggml`/`gguf` Whisper model file (large-v3 for best accuracy, small/base if the machine is CPU-only).

Going live with real patient audio additionally requires:
- No BAA is needed with the default local providers — audio/transcripts never leave the machine.
- A BAA with whichever cloud vendor is enabled, if any (`deepgram`, `openai-whisper`, `claude`, `openai`) — enforced by the consent gate above, but the human step (actually signing one) still has to happen first.

## Operational Commands

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies (requires Node.js + Visual Studio Build Tools — see Prerequisites). Triggers `postinstall: electron-builder install-app-deps`, which rebuilds native modules (`argon2`, `better-sqlite3-multiple-ciphers`) against Electron's ABI. Verified working end-to-end on this machine. |
| `npm run dev` | Run renderer (Next dev server, :3000), main process (tsc --watch), and Electron concurrently |
| `npm run build` | Static-export the renderer and compile the main process to `dist/` |
| `npm run package` | Build + package a distributable Windows binary via electron-builder |
| `npm run typecheck` | Type-check main and renderer without emitting |
| `npm run lint` | ESLint over the whole project |
| `npm test` | Run Jest unit tests |

## Code Style Rules

- **Strict TypeScript everywhere.** `strict: true` in both `src/main/tsconfig.json` and `src/renderer/tsconfig.json`. No `any` without a comment explaining why it's unavoidable.
- **Component boundaries**: one component per file under `src/renderer/components`. `components/ui/*` holds reusable primitives (`Card`, `Badge`); everything else is a feature component.
- **Electron process boundary**: `src/main` never imports from `src/renderer` or vice versa. Shared types live in `src/common` and are imported by both. The renderer never talks to Node/Electron APIs directly — only through `contextBridge` channels defined in `src/main/preload.ts`.
- **Tailwind, high-contrast for clinical monitors**: use the `panel-*` and `accent-*` color tokens defined in `src/renderer/tailwind.config.ts`, not raw hex values. Body text defaults to the `clinical` font-size utility. Every interactive element needs a visible focus/hover state.
- **No premature abstraction**: don't generalize a provider, repo, etc. until at least two concrete implementations exist and the shared shape is obvious.
- **Swappable backend pattern**: `TranscriptionProvider` and `LlmProvider` are the canonical examples — a narrow interface in `src/common/types`, concrete implementations in `src/main/ai/<area>/`, and one `registry.ts` per interface that is the *only* file allowed to switch on provider id. Feature code depends on the interface only, never imports a concrete provider class directly.
- **Every IPC channel goes through `withAuth`**: register it via `src/main/ipc/withAuth.ts`, never a bare `ipcMain.handle`. It validates the session (and its 15-minute inactivity window) before the handler runs — the only three channels that skip it are `auth:login`, `auth:bootstrapFirstUser`, and `auth:isBootstrapNeeded`, since no session can exist yet when they run.

## Architecture Notes

- **Data security**: `src/main/db/index.ts` opens the single SQLite file with SQLCipher (`better-sqlite3-multiple-ciphers`), keyed by a random passphrase generated once and sealed with Electron `safeStorage` (`src/main/security/keyManager.ts`, generalized into `src/main/security/secretStore.ts` which also holds optional cloud API keys) — the passphrase itself never touches disk in plaintext.
- **What's actually in the database**: `users` (accounts), `sessions` (15-minute sliding inactivity window, enforced via `withAuth` → `requireSession` → `touchSession`), and `style_examples` (the dentist's own example notes, owned per user). Nothing else. See Scope above for why.
- **Auth is session-only, no RBAC**: `src/main/auth/sessionGuard.ts`'s `requireSession` checks the token is valid and the user still exists — that's it, no permission matrix. `src/main/ipc/withAuth.ts` wraps every guarded channel with this check.
- **First-run bootstrap**: `auth:isBootstrapNeeded` returns `true` while the `users` table is empty; `LoginScreen` shows "Create Account" in that state and `auth:bootstrapFirstUser` creates the one-time first account (there's no "admin" role — just the one account that gets to exist first). 5 failed logins locks an account for 15 minutes (`usersRepo.ts`); the same generic "Invalid username or password" covers both a wrong password and an unknown username (no user-enumeration signal).
- **Session token never reaches the renderer page's JS**: it lives only in `preload.ts`'s module closure. `contextIsolation: true` means a compromised page can call the exposed functions but can't read the token itself out of scope.
- **AI is provider-agnostic by interface**: `src/common/types/transcription.ts` (`TranscriptionProvider`) and `src/common/types/llm.ts` (`LlmProvider`) are the only shapes any calling code depends on. Concrete backends live in `src/main/ai/transcription/*` and `src/main/ai/llm/*`. `registry.ts` in each folder is the *only* place that switches on provider id.
- **Style formatting**: `src/main/ai/formatting/noteFormatter.ts` fetches the user's stored `style_examples`, builds a few-shot prompt (system instructions + each example as a user/assistant exchange + the real transcript), and calls `LlmProvider.complete()`. The system prompt explicitly instructs the model to resolve self-corrections ("oh sorry, I mean...") by keeping only the corrected statement, and to use speaker labels (see below) to distinguish clinician from patient without echoing the raw labels into the output note.
- **Provider selection vs. secrets are stored separately**: which provider is active (`transcriptionProvider`, `llmProvider`) lives in `src/main/config/aiConfig.ts` (electron-store, plain JSON, not secret — shape defined in `src/common/types/aiConfig.ts` so the renderer's Settings UI can read/write it too). Cloud API keys live in `src/main/security/secretStore.ts` (Electron `safeStorage`-encrypted) via the named constants in `src/common/types/credentials.ts`.
- **Audio capture is raw Web Audio API, not MediaRecorder**: `src/renderer/lib/audioCapture.ts` captures mic PCM directly (via `ScriptProcessorNode`) rather than using `MediaRecorder`, because MediaRecorder's native output (WebM/Opus) would need a transcoding step before any STT provider could read it — capturing raw PCM avoids that dependency entirely. A high-pass (80Hz) + low-pass (8kHz) `BiquadFilterNode` chain sits between the mic and the capture point to attenuate low rumble and the highest drill/scaler harmonics; the filtered PCM is resampled to 16kHz and encoded to a WAV buffer client-side, then sent over IPC to `scribe:transcribeAudio`, which writes it to a temp file, transcribes it, and deletes the temp file immediately (zero-retention — no raw audio persists anywhere, matching the ephemeral-by-design scope).
- **Diarization is opportunistic, not guaranteed**: `TranscriptionResult.diarized` + `TranscriptionSegment.speaker` exist in `src/common/types/transcription.ts`, but only `DeepgramProvider` actually populates them (via `diarize=true`, grouping Deepgram's word-level speaker tags into segments). `LocalWhisperProvider` (the default) and `OpenAiWhisperProvider` always report `diarized: false` — whisper.cpp has no speaker-ID model, and adding one (e.g. a Python/pyannote dependency) would break the zero-Python-dependency, zero-cost-by-default architecture. If true "who said what" matters more than the cost trade-off, switching `transcriptionProvider` to `deepgram` in Settings is the current path, not a new local model.

## Iterative Task Backlog

Maintained by the `/judge` review pass after each feature cycle. Format: `[x]` done, `[ ]` remaining.

### Done
- [x] Encrypted SQLite database (`users`, `sessions`, `style_examples`) with SQLCipher + `safeStorage`-sealed key
- [x] Argon2id password hashing, 5-attempt/15-minute account lockout, generic invalid-credentials error
- [x] First-run bootstrap flow, login, logout, 15-minute sliding-inactivity sessions actually enforced via `withAuth`
- [x] Session token confined to `preload.ts`'s closure, never exposed to renderer page JS
- [x] `TranscriptionProvider` / `LlmProvider` interfaces with local defaults (whisper.cpp, Ollama) and optional cloud swaps (Deepgram, OpenAI, Claude) behind a `cloudProviderConsentAcknowledged` gate
- [x] Style-examples CRUD (`style_examples` table, repo, IPC channels) and `noteFormatter.ts`'s few-shot formatting pipeline, with explicit self-correction-resolution instructions in the prompt
- [x] Single-screen renderer: paste/record transcript → Format Note → formatted output → Copy, plus an in-page style-examples manager (add/list/remove)
- [x] Real audio capture (`src/renderer/lib/audioCapture.ts`): mic → high-pass/low-pass noise filtering → 16kHz WAV → `scribe:transcribeAudio` → `TranscriptionProvider.transcribe()`, temp file deleted immediately after (zero-retention)
- [x] Speaker diarization where the provider supports it (Deepgram, opportunistic — see Architecture Notes for why this isn't universal and isn't going to be for the local default)
- [x] Settings UI (`src/renderer/components/settings/SettingsPanel.tsx`): switch `transcriptionProvider`/`llmProvider`, edit local-whisper/Ollama config, toggle cloud-provider consent, set/clear/check cloud API keys (write-only — keys are never read back to the renderer, only a configured/not-configured status)
- [x] Node.js and Visual Studio Build Tools installed on this machine; `npm install` completes for real (native modules actually compiled/bundled, not skipped) — see Verification below
- [x] Startup failures now surface to the user (`dialog.showErrorBox` + quit) instead of a silent unhandled-rejection warning — found by actually launching the app
- [x] **The packaged app was launched end-to-end and confirmed working** — window opens with the correct title, no errors, no warnings

### Verification (2026-07-20)
Ran for real, not assumed, in multiple passes as blockers got resolved. Found and fixed 6 real bugs along the way that no amount of code review would have caught:

1. **`npm run typecheck` — `src/main/db/index.ts` called `instance.key(passphrase)` with a `string`**; the package's real type signature requires a `Buffer`. Fixed with `Buffer.from(passphrase, 'utf-8')`. Wrong since Phase 1, never caught until a real compiler ran.
2. **`npm run lint` — an unescaped `'` in `ScribePanel.tsx` JSX text**, and the Next.js ESLint plugin couldn't find `pages`/`app` because it resolved relative to the repo root instead of `src/renderer` — fixed with `settings.next.rootDir` in `.eslintrc.json`.
3. **`npm run build:renderer` — Tailwind generated zero utility classes.** `next build src/renderer` (directory passed as a CLI arg, never `cd`-ing into it) left PostCSS's config resolution running from the repo root, so it never found `src/renderer/tailwind.config.ts` at all — no config file edit could have fixed this (two attempts at rewriting `content` globs didn't help, because the file was never loaded). The actual fix: changed `dev:renderer`/`build:renderer` to `cd src/renderer && next ...` instead of `next ... src/renderer`.
4. **That fix exposed a second, previously-latent bug**: `main/index.ts`'s production `loadFile` path assumed the static export landed at `dist/renderer/out/index.html`; Next's `output: 'export'` actually writes to `src/renderer/out`. Fixed the path, verified the real output location with `ls`.
5. **`app.whenReady().then(...)` had no `.catch()`** — any startup failure surfaced only as a silent unhandled-rejection warning with no window and no explanation. Fixed with `dialog.showErrorBox()` + `app.quit()`.
6. **The initial `npm install` failed outright**: `better-sqlite3-multiple-ciphers` had no prebuilt binary for Node v24/win32/x64 and needed Visual Studio Build Tools (C++ workload) to compile from source, which wasn't installed. A first unelevated `winget install` of Build Tools failed with exit 1602 (needs Administrator elevation). **Elevation was then tested and confirmed to work in this session** (`Start-Process -Verb RunAs` succeeds; the account is a genuine Administrator, just running with UAC's default filtered token) — Build Tools installed successfully once run elevated, and a full `npm install` (no `--ignore-scripts`) then completed cleanly: `better-sqlite3-multiple-ciphers` compiled from source against the new MSVC toolchain, `argon2` used its bundled `win32-x64` prebuild, Electron's binary downloaded normally.

**Final result — the packaged app was launched for real** (`electron.exe dist/main/index.js`) and confirmed via `Get-Process | Select MainWindowTitle` to open a window titled "DentiScribe AI", with zero errors or warnings in the process output. Every layer — database init with SQLCipher encryption, schema creation, IPC registration, permission handler, main window creation, static renderer load — runs correctly end-to-end. `npm run typecheck`, `npm run lint`, `npm run build:renderer`, and `npm run build:main` all pass clean. This is not a "should work" claim — it was actually run and observed working.

**Update**: `LocalWhisperProvider`'s CLI flags are no longer an open question either — downloaded the real whisper.cpp v1.9.1 Windows release, ran `whisper-cli.exe --help`, and confirmed `-m`/`-f`/`-oj`/`-of`/`-nt` all exist exactly as coded. Then ran an actual transcription against a real audio file and confirmed the output JSON shape matches `WhisperCliJsonOutput` exactly. See `localWhisperProvider.ts`'s header comment for the full trail.

### Not started
- [ ] Verify each optional cloud provider's request/response shape against a live account once credentials exist
- [ ] `AudioWorklet` migration for `audioCapture.ts` — currently uses the deprecated `ScriptProcessorNode`, which works but isn't the modern API; revisit if audio glitches or main-thread jank show up in real use

## Distribution (2026-07-20)

The goal: other dentists can download one file, install it without a terminal, and have the AI work without ever seeing a command line. Distributing for free, no code signing (see below for why that's an acceptable tradeoff here).

### Packaging
`package.json`'s `build` config (electron-builder) produces a single NSIS installer:
- **One-click, per-user install** (`oneClick: true`, `perMachine: false`) — no install-location choices to make, and critically, **no admin rights required to install** (a per-user NSIS install doesn't need elevation), which matters since dentists on office computers often aren't local admins.
- `npm run package` → `release/DentiScribe AI Setup 0.1.0.exe`. Verified end-to-end: built successfully (132MB), and the packaged app actually launches (see Verification above).
- **A real packaging-time bug, worth knowing about**: electron-builder's Windows build step needs to extract a bundled 7z archive (`winCodeSign`, containing cross-platform tooling it ships internally, unrelated to our own code) that contains symlinks, which fails with "required privilege not held" unless the process is either elevated or Windows Developer Mode is on. Fixed the first time by running `npm run package` itself under `Start-Process -Verb RunAs` elevation — a normal build action, not a system-settings change (editing the registry to enable Developer Mode instead was correctly blocked as an out-of-scope system-settings modification — don't attempt that path). **This is a one-time cost, not a recurring one**: electron-builder caches the extracted archive under `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\`, so every subsequent `npm run package` on the same machine — confirmed by actually rebuilding after adding the Setup Wizard — reuses the cache and needs no elevation at all.
- **Rebuilt and re-verified after adding the Setup Wizard**: `npm run package` (no elevation needed the second time, per the caching note above) produced a new 132MB installer, and launching it directly again confirmed the window still opens correctly titled "DentiScribe AI" with zero errors — the Setup Wizard/DashboardShell integration didn't break startup.
- No app icon is set yet (electron-builder falls back to a default Electron icon) — cosmetic, add one later.
- No code signing — see "Why no code signing" below.

### Why no code signing
Decided against it: this is free, hobbyist-scale distribution, and a real code-signing certificate costs money (~$70-400/yr) and requires identity verification — not worth it for now. The tradeoff: Windows SmartScreen will show an "Unknown Publisher" warning on first run. Mitigated with clear docs (`docs/getting-started.html`) walking through the one "More info → Run anyway" click, framed as normal rather than alarming. If this ever needs to go away without a full cert, Microsoft's "Trusted Signing" (~$10/mo) is the cheap middle ground — not implemented, just noted as an option.

### Setup Wizard — making the AI actually work without a terminal
The single biggest UX risk for non-technical users was that the AI stack needs Ollama (running + a pulled model) and a local whisper.cpp binary + model file, previously requiring manual command-line setup. `src/main/setup/` + `src/renderer/components/setup/SetupWizard.tsx` fully automate this:

- **Ollama**: `src/main/setup/ollamaSetup.ts` installs via `winget install --id Ollama.Ollama -e --silent ...` (reusing the exact pattern already proven reliable in this project's own dev setup) rather than downloading/running Ollama's raw InnoSetup installer directly — there are known real-world reports of that installer's silent-mode flags being unreliable. Model pulling uses Ollama's own `/api/pull` endpoint (verified against Ollama's actual documented API: request body field is `model`, not `name`; streaming NDJSON lines carry `status`/`total`/`completed`; `{"status":"success"}` marks completion) — Ollama handles fetching model weights itself, we just ask it to and stream its progress to the UI.
- **Whisper**: `src/main/setup/whisperSetup.ts` downloads `https://github.com/ggml-org/whisper.cpp/releases/latest/download/whisper-bin-x64.zip` (GitHub's "latest release" redirect pattern, so this never goes stale — verified it actually resolves), extracts it with Windows' built-in `tar.exe` (ships since Windows 10 1803, handles .zip natively — no new npm dependency needed), and separately downloads a ggml model from Hugging Face's stable URL pattern (`https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-<name>.bin` — verified all four size tiers actually exist with real HTTP 200s). Both the zip contents and the download URLs were verified by actually downloading and running them, not assumed.
- Model size choice (`small`/`medium`/`large` in the UI) deliberately maps to whisper.cpp's `base.en`/`small.en`/`medium.en` — not `large-v3` — because whisper's own "large" tier is impractically slow on a CPU-only office PC with no GPU. This is a deliberate substitution, documented in `whisperSetup.ts`, not a naming mistake.
- Progress reporting required extending `withAuth`'s context with the raw IPC event (`ctx.event.sender.send(...)`) so long-running steps can stream progress back to the renderer instead of blocking silently — the one deliberate widening of that abstraction, and it's additive/non-breaking for every existing handler.
- `SetupWizard.tsx` shows automatically on first login if anything's incomplete, is fully skippable (nothing blocks using the rest of the app), and is reachable anytime via a "Setup" button in the header.
- Default Ollama model bumped to `llama3:8b` per product decision (better note quality than a 3B model, still CPU-runnable) — comment in `aiConfig.ts` flags this tag should be re-verified against Ollama's current library if it's been a while since this was written.

### Getting it to dentists
- `docs/index.html` + `docs/getting-started.html` — a minimal, self-contained (no build step, no external assets) landing page and walkthrough, dark-themed to match the app. Written for a non-technical reader: explains the SmartScreen warning as normal, walks through account creation → setup wizard → style examples → record/format/copy, and covers the 3 most likely failure modes (setup download blocked, mic permission denied, antivirus flag).
- **Hosting plan — free, no domain purchase needed**: GitHub Pages for the docs site (`<username>.github.io/<repo>`, permanent, free, and inherently trusted — never flagged as suspicious, unlike free-domain services like Freenom which have become unreliable and are often blocked by security tools) + GitHub Releases for the installer file itself (free, versioned, and this is exactly what `electron-updater`'s GitHub provider expects if auto-updates get wired up later).
- **This part needs you, not me**: I can't create a GitHub repository or push code on your behalf — that needs your own account/credentials. To finish this:
  1. Create a GitHub repo (public, free)
  2. Push this project to it (`git remote add origin <url>`, `git push -u origin master` — this repo has never been pushed anywhere; it's all local commits so far)
  3. Go to Settings → Pages, set source to the `docs/` folder on `master`
  4. Create a Release, attach `release/DentiScribe AI Setup 0.1.0.exe` as a release asset
  5. Update the placeholder download link in `docs/index.html` (marked with a comment) to point at that release asset's URL, and add a support email where marked in `getting-started.html`
  6. Commit + push the updated `docs/index.html`, Pages picks it up automatically

### Distribution backlog
- [x] Packaging config + verified working installer
- [x] SmartScreen/no-code-signing decision + user-facing explanation
- [x] Setup Wizard (Ollama + whisper.cpp), fully automated, real URLs/APIs verified
- [x] Getting-started docs + landing page
- [ ] Push to GitHub, enable Pages, create first Release (needs your GitHub account — see steps above)
- [ ] App icon (cosmetic)
- [ ] `electron-updater` auto-update wiring (natural next step once a GitHub repo exists to publish releases to)
- [ ] EULA/disclaimer text in-app (a note-formatting aid, not a diagnostic tool, no warranty) — draftable on request, but have an actual lawyer glance at it before wide distribution given the healthcare-adjacent context
