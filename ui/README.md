# DeepNoise UI

ReactFlow-based interface for the DeepNoise audio workflow.

## Start in development

```bash
cd ui
npm install
npm run dev
```

By default, API requests go to `/api` and use Vite proxy.

## Optional environment variables

- `VITE_API_BASE_URL` (browser runtime base URL)
- `DEEPNOISE_API_PROXY_TARGET` (Vite dev proxy target)

## Production build

```bash
cd ui
npm run build
npm run preview
```
