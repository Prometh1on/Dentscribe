# DentiScribe AI

A free, local-first note-formatting tool for dental practices. Record or paste an encounter transcript, get back a clean clinical note formatted in your own style, copy it into your EHR. Nothing else — no patient database, no EHR integration, no cloud requirement.

## Not a developer? Start here.

**You don't need GitHub, a developer, or any technical knowledge to use this app.**

👉 **[Download it from the website](https://prometh1on.github.io/Dentscribe/)** and follow the on-page instructions. That's the whole process:

1. Click the download button
2. Double-click the downloaded file
3. Click "Run anyway" on the Windows security prompt (this is normal — explained on the page)
4. Follow the one-time setup screen that opens automatically

A full step-by-step walkthrough with everything explained in plain English is here: **[Getting Started Guide](https://prometh1on.github.io/Dentscribe/getting-started.html)**.

Everything below this point is for developers who want to look at or modify the code.

## What it does

- **Records or accepts a pasted transcript** of a dental encounter
- **Transcribes locally** using Whisper (or an optional cloud provider)
- **Formats the transcript into a clinical note**, matching a style you teach it from your own example notes
- **Categorizes by appointment type** (routine exam, emergency, treatment, hygiene, referral, orthodontic) to help the AI structure the note appropriately
- **Remembers assisting staff names** for quick reuse
- **Generates derived documents** — patient letters, referral letters, consent forms — from the same formatted note
- Runs entirely on your own computer by default; nothing leaves the machine unless you explicitly turn on a cloud provider in Settings

## Why it's free and local by default

- **Local AI (default):** Ollama for note formatting, whisper.cpp for transcription — both run on your own hardware, no subscription, no per-use cost, no internet dependency once installed.
- **Optional cloud providers:** Claude, OpenAI, or Deepgram can be enabled in Settings if you want higher accuracy and don't mind an API cost — gated behind an explicit consent checkbox, since that means patient audio/text leaves the machine.

## Tech stack

Electron (main process) + Next.js/Tailwind (renderer, statically exported) + TypeScript throughout. SQLCipher-encrypted local SQLite for the only things ever persisted: user accounts, style examples, and remembered staff names.

## Development

```bash
npm install       # requires Node.js + (on Windows) Visual Studio Build Tools for native modules
npm run dev       # renderer (Next dev server) + main process (tsc --watch) + Electron, concurrently
npm run typecheck # type-check main and renderer without emitting
npm run lint      # ESLint over the whole project
npm run package   # build a distributable Windows installer via electron-builder
```

## License

No license file yet — all rights reserved by default until one is added.
