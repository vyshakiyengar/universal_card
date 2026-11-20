# Sign-in and private storage

1. Create a Supabase project and apply every file in [supabase/migrations](../supabase/migrations) in order. You can run the migration in the project's SQL editor or use `supabase db push` with a linked project.
2. Copy `.env.example` to `.env.local`. Set the project URL, publishable key and `APP_ORIGIN`. For local development use `http://localhost:3000` consistently. For hosting, use the exact HTTPS origin.
3. In Supabase Authentication → URL Configuration, set the site URL to the deployed origin and allow the app's `/auth/callback` URL for each environment. For example, add `http://localhost:3000/auth/callback` for development.
4. Enable Google and Apple in Supabase Authentication. Register the **Supabase** callback URL displayed on each provider's configuration screen with that provider, and enter its credentials in Supabase. Google needs an OAuth Web client ID and secret. Apple needs a Sign in with Apple Services ID and client secret generated with its Apple Developer signing key. Rotate the Apple client secret before its expiration. See [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google) and [Supabase Apple setup](https://supabase.com/docs/guides/auth/social-login/auth-apple).

The app uses the publishable key and the signed-in user's session. The database assigns card ownership from that session and applies row-level security. Deleting an Auth user deletes their cards. Device preview data remains in its original browser when account mode is enabled. Use synthetic details when validating a public test deployment.

Verify each provider on the deployed origin. Sign in on two browsers to the same account and save a card on one. Confirm that the other can reopen it, and that a second account cannot list, edit, delete, or export that card. Then sign out and verify that the app prompts for sign-in again.

## Account controls and administration

The signed-in account page offers a JSON export and permanent account deletion. Verify these flows with a disposable account. The admin dashboard at `/admin` reads daily aggregate counts only for the verified owner account. Successful sign-in counts begin when the launch migration is applied. Card creation counts include cards still present at migration time and new creations thereafter.

Set the server-only `SUPABASE_SECRET_KEY` in the hosting environment to record signed Wallet downloads. This counter counts successful pass responses, not installation on a device. The privacy and terms pages describe the data handled by this app. Confirm the operator contact and applicable retention and jurisdiction details before a public launch.
