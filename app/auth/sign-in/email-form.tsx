"use client";

import { useActionState } from "react";
import { signInWithEmail, type EmailState } from "./actions";
import styles from "./sign-in.module.css";

const initialState: EmailState = { email: "", step: "request" };

export function EmailForm({ available }: { available: boolean }) {
  const [state, action, pending] = useActionState(signInWithEmail, initialState);
  const verifying = state.step === "verify";

  return (
    <form action={action} className={styles.form} key={state.step}>
      {verifying ? (
        <>
          <p className={styles.instructions} role="status">Enter the code sent to {state.email}.</p>
          <input type="hidden" name="email" value={state.email} />
          <label htmlFor="sign-in-code">Sign-in code</label>
          <input
            autoComplete="one-time-code"
            id="sign-in-code"
            inputMode="numeric"
            maxLength={10}
            minLength={6}
            name="code"
            pattern="[0-9]{6,10}"
            required
            type="text"
          />
        </>
      ) : (
        <>
          <label htmlFor="sign-in-email">Email address</label>
          <input
            autoComplete="email"
            defaultValue={state.email}
            disabled={!available}
            id="sign-in-email"
            maxLength={254}
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </>
      )}
      {state.error && <p className={styles.error} role="alert">{state.error}</p>}
      <button className={styles.primary} disabled={!available || pending} type="submit">
        {pending ? (verifying ? "Checking code…" : "Sending code…") : (verifying ? "Sign in" : "Send sign-in code")}
      </button>
      {verifying && <a href="/auth/sign-in" className={styles.reset}>Request a new code</a>}
    </form>
  );
}
