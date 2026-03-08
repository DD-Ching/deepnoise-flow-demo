# RELEASE CHECKLIST

Use this checklist before publishing the public repository.

- [ ] `./scripts/security_scan.sh` passed.
- [ ] `./scripts/public_release_check.sh` passed.
- [ ] No `.env` or `.env.*` files are tracked.
- [ ] No API keys / tokens / secrets in tracked files.
- [ ] Logs removed (`*.log`, `.runlogs/`).
- [ ] Caches removed (`.cache/`, `ui/.vite/`, `__pycache__/`, `.pytest_cache/`).
- [ ] Temporary files removed (`tmp/`, `temp/`, scratch exports).
- [ ] Build artifacts removed from tracked files (`dist/`, `build/`, `coverage/`).
- [ ] Local model checkpoints removed from tracked files (`*.ckpt`, `*.pt`, `*.pth`, `*.onnx`).
- [ ] Uploaded demo outputs removed from tracked files (`output_runs/`, exports, generated audio).
- [ ] Legacy internal naming and event references removed.
- [ ] Public README is up to date and showcase-focused.
- [ ] Deployment environment variables documented separately (not committed).
- [ ] If secrets ever existed in git history, credentials have been rotated.
- [ ] Public release is created from a **new clean repository history**.
