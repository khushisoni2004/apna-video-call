# Apna Video Call - Run Commands

## Local run

Backend:
```bash
cd backend
npm install --legacy-peer-deps
npm run dev
```

Frontend:
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

Open: http://localhost:3000

## One-command public run

```bash
./run-public.sh
```

The script starts backend, frontend, Cloudflare tunnels, updates `.env`, and prints the final public meeting link.
