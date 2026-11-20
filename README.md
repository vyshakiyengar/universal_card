# Heya Cards

A private card studio for in-person networking. Save multiple named cards and add each one to Apple Wallet. A Universal card encodes a vCard directly in the QR. Individual cards go straight to LinkedIn, WhatsApp, email, phone, Instagram, Snapchat, or a website.

## Run locally

Use Node.js 22 or newer and npm. OpenSSL and unzip are required for the Wallet signature test.

```sh
npm ci
npm run dev
```

Open [the app](http://localhost:3000). Without account settings, the editor runs in device preview mode and saves cards in your browser. You can download each QR as a PNG and Universal contacts as a `.vcf` file.

## Configure and deploy

1. Follow [sign-in and storage setup](docs/auth.md) to configure Supabase, apply the database migration, and enable Apple, Google, and email sign-in.
2. Follow [Apple Wallet setup](docs/wallet.md) to configure a Pass Type ID, the signing certificate and key, and the issuing Apple WWDR intermediate. Sign-in credentials and Wallet signing credentials are separate.
3. Deploy from the repository root to a Next.js hosting service with a Node.js runtime using `npm ci` and `npm run build`. For self-hosting, start it with `npm start`. Set the variables from [.env.example](.env.example) in the hosting environment. Use an HTTPS origin that matches `APP_ORIGIN` and the allowed callback URL.
4. Verify both [sign-in](docs/auth.md) and [Wallet install and phone scanning](docs/wallet.md#physical-device-validation) on that deployment. The Wallet button appears for saved account cards when signing is configured.

Keep the Wallet private key and passphrase in the hosting service’s server-only secret store. Do not commit credentials. No account cards or contact QR payloads are made available through a public profile route.

## QR and contact behavior

Universal cards use UTF-8 vCard 3.0 with a structured `N` name, CRLF line endings, escaped field values, and 75-octet folding. Users can include a name, role, company, multiple labeled phone numbers and email addresses, and selected links. If the name is blank the vCard uses `Contact` as its display name. The private card name does not go into the QR. Phones use international format with a country code.

Anyone with a copy or photo of a QR can read and reshare what's encoded. Saved cards are private to their account. A vCard-aware scanner can import the embedded contact without visiting a website. The card owner can also download its `.vcf` from the editor.

The editor counts UTF-8 bytes with medium error correction. It warns above 213 bytes and rejects more than 412 bytes. The browser QR has a four-module quiet zone. Wallet renders its own QR from the saved payload, so verify a real pass alongside the web preview before launch.

## Launch features

- **Try before sign-in:** a first-time visitor can use the studio for one visit (two-hour window) without an account. Cards stay in that browser. Signing in, or tapping Add to Apple Wallet, moves them into the account. Later visits need sign-in.
- **Card limit:** each account can keep up to 50 cards, enforced in the database (`supabase/migrations/20261120000100_card_limit_and_events.sql`).
- **Launch funnel:** `/api/events` counts anonymous, aggregate events (CTA clicks, trials, shares, Wallet taps). See `/admin`.
- **Health and uptime:** `/api/health` reports sign-in and Wallet signing status, including a Wallet certificate within 30 days of expiry. `.github/workflows/uptime.yml` checks the site every 15 minutes, and a failed run emails the repository owner. Set the repository variable `WALLET_LIVE=true` once Wallet signing is live to alert on it too.
- **Region:** functions run in Dublin (`vercel.json`), next to the Supabase database in eu-west-1.
- **How it works clip:** set `howItWorksClip` in `lib/site.ts` once the recording is in `public/media/`.

## Tests

```sh
npm run typecheck
npm test
npx playwright install chromium webkit
npm run test:e2e
npm run build
```

Tests cover independent QR decoding, vCard formatting and density boundaries, database owner isolation, and Wallet bundle signatures with a temporary non-Apple test certificate chain. Browser tests cover the editor and downloads on desktop Chrome, mobile Chrome and mobile Safari emulation. Use the [physical-device checklist](docs/wallet.md#physical-device-validation) for native Camera/Lens behavior, contact import, and Wallet installation.
