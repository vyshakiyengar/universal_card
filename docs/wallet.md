# Apple Wallet setup

The editor creates QR codes without Wallet credentials. Wallet export requires a saved card in a signed-in account and an Apple Developer Pass Type ID certificate. Use a Node.js deployment and configure the following values as server-only secrets in the deployment environment. For local development, use the ignored `.env.local` file. Keep the signing key and its passphrase out of commits and client-exposed environment variables.

1. Register a Pass Type ID, then issue a Pass Type ID certificate using a certificate signing request. Retain the private key that generated the request. Sign in with Apple uses separate credentials. [Apple Wallet identifiers and certificates](https://developer.apple.com/help/account/capabilities/create-wallet-identifiers-and-certificates)
2. Export the associated RSA private key in PEM format. If you used Keychain Access, export the certificate and key to a password-protected `.p12`, then extract the key with `openssl pkcs12 -in wallet.p12 -nocerts -out wallet-key.pem`. The command prompts for a password for the exported PEM.
3. Download the WWDR intermediate that issued the signing certificate. Apple currently assigns Pass Type IDs to WWDR G4. [WWDR certificate mapping](https://developer.apple.com/help/account/certificates/wwdr-intermediate-certificates/) and [Apple PKI downloads](https://www.apple.com/certificateauthority/)
4. Encode the signer certificate, key and WWDR intermediate as single-line base64 with `base64 < path/to/file | tr -d '\r\n'`. Certificates may be DER or PEM. Base64 preserves the file bytes for the environment variable. Retain the password on the PEM and store the encoded key as a secret.

| Variable | Value |
| --- | --- |
| `APPLE_WALLET_PASS_TYPE_ID` | Registered reverse DNS identifier such as `pass.com.example.universalcard` |
| `APPLE_WALLET_TEAM_ID` | Ten-character Apple Developer team ID on the signing certificate |
| `APPLE_WALLET_ORGANIZATION_NAME` | Issuer name shown in Wallet |
| `APPLE_WALLET_SIGNER_CERT_BASE64` | Apple-issued Pass Type ID certificate |
| `APPLE_WALLET_SIGNER_KEY_BASE64` | Corresponding PEM private key |
| `APPLE_WALLET_WWDR_CERT_BASE64` | Issuing Apple WWDR intermediate certificate |
| `APPLE_WALLET_SIGNER_KEY_PASSPHRASE` | Password for an encrypted PEM private key |

Deploy with HTTPS. Open the site in Safari on an iPhone, sign in, save a card and select **Add to Apple Wallet**. Verify the Wallet preview, add the card and scan it from another device. Each card has its own serial number. To replace a pass after editing a card, download it again. Deleting the card removes the account copy. Previously installed passes and photographs of the QR can still be read. [Apple pass distribution](https://developer.apple.com/documentation/walletpasses/distributing-and-updating-a-pass)

## Verification

The automated signing tests use OpenSSL and `unzip` to verify the manifest, detached CMS signature, test certificate chain and exact UTF-8 QR message using temporary test certificates. Installation and QR rendering in Wallet need testing on an iPhone with Apple-issued credentials.

### Physical device validation

Record the iPhone and Android model, OS version and scanner app for each result. Use a second device to scan both the web preview and installed pass under normal lighting, then repeat near the density warning with a longer vCard. Verify the values shown in the contact preview and again in the imported contact.

| Sample | Scanners | Expected result |
| --- | --- | --- |
| Universal with accented or non-Latin name, two labelled emails, two labelled phones, job title, company and links | iPhone Camera and Android Camera or Lens | A compatible scanner offers contact import with the name, labels and selected fields. Record each scanner's behaviour and any dropped fields. |
| Universal with the name omitted | iPhone Camera and Android Camera or Lens | The contact preview uses the name `Contact`. |
| Individual LinkedIn, Instagram, WhatsApp and website | iPhone Camera and Android Camera or Lens | Each opens the corresponding destination without an intermediate contact page. |
| Individual email and phone | iPhone Camera and Android Camera or Lens | Each offers to open the mail composer or phone dialler with the expected value. |
| Universal at the density warning | iPhone Camera and Android Camera or Lens | Test focus and decoding on each device, recording the failures as well as the successes. Wallet chooses its own QR layout. |
