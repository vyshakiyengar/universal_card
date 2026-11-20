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

Universal cards use UTF-8 vCard 4.0 with CRLF line endings, escaped field values, and 75-octet folding. Users can include a name, role, company, multiple labeled phone numbers and email addresses, and selected links. If the name is blank the vCard uses `Contact` as its display name. The private card name does not go into the QR. Phones use international format with a country code.

Anyone with a copy or photo of a QR can read and reshare what's encoded. Saved cards are private to their account. A vCard-aware scanner can import the embedded contact without visiting a website. The card owner can also download its `.vcf` from the editor.

The editor counts UTF-8 bytes with medium error correction. It warns above 213 bytes and rejects more than 412 bytes. The browser QR has a four-module quiet zone. Wallet renders its own QR from the saved payload, so verify a real pass alongside the web preview before launch.

## Tests

```sh
npm run typecheck
npm test
npx playwright install chromium webkit
npm run test:e2e
npm run build
```

Tests cover independent QR decoding, vCard formatting and density boundaries, database owner isolation, and Wallet bundle signatures with a temporary non-Apple test certificate chain. Browser tests cover the editor and downloads on desktop Chrome, mobile Chrome and mobile Safari emulation. Use the [physical-device checklist](docs/wallet.md#physical-device-validation) for native Camera/Lens behavior, contact import, and Wallet installation.
