
# TradesCard Web (App Router, TS, Tailwind)

## Run
```bash
npm install
npm run dev
```

Open http://localhost:3000. Fill the form and you’ll be redirected to Stripe Checkout using your existing API.

To use a different backend domain, create `.env.local` with:
```
NEXT_PUBLIC_API_BASE=https://tradescard-api.vercel.app
```

## Build
```
npm run build && npm start
```
