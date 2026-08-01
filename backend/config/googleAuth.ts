import { OAuth2Client } from 'google-auth-library';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Google sign-in.
 *
 * Optional: without GOOGLE_CLIENT_ID the app behaves exactly as before and the
 * UI never offers the Google button.
 *
 * This is the Google Identity Services flow, not the classic redirect dance.
 * The browser obtains a signed ID token from Google and posts it here; we
 * verify the signature against Google's published keys and trust nothing else
 * the client sent. That keeps the whole thing stateless, which matters because
 * the rest of this API has no sessions to hang an OAuth handshake off — and it
 * needs only a client id, so there is no client secret to leak.
 */

export const googleAuthEnabled = (): boolean => Boolean(process.env.GOOGLE_CLIENT_ID);

/**
 * Safe to hand to a browser — the client id is public by design.
 *
 * `||` rather than `??`: a blank `GOOGLE_CLIENT_ID=` line in a .env file is an
 * empty string, not undefined, and "" is not a client id.
 */
export const googleClientId = (): string | null => process.env.GOOGLE_CLIENT_ID || null;

let client: OAuth2Client | null = null;

const getClient = (): OAuth2Client => {
  client ??= new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return client;
};

export interface GoogleIdentity {
  /** Google's stable, never-reused subject id for this account. */
  googleId: string;
  email: string;
  name: string;
}

/**
 * Verifies a Google ID token and returns the identity it asserts.
 *
 * Throws UnauthorizedError on anything suspicious. The checks that matter:
 *
 * - `verifyIdToken` validates the signature, expiry, and issuer, and — via
 *   `audience` — that the token was minted for *this* application. Without the
 *   audience check, a token issued to any other Google app would be accepted
 *   here, which is the classic way this integration gets broken into.
 * - `email_verified` must be true. An unverified address on the Google side
 *   proves nothing, and we match accounts by email, so accepting one would let
 *   an attacker claim someone else's account.
 */
export const verifyGoogleIdToken = async (credential: string): Promise<GoogleIdentity> => {
  let payload;

  try {
    const ticket = await getClient().verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    // The underlying message describes a token we do not control; there is
    // nothing here a caller can act on beyond "that did not work".
    throw new UnauthorizedError('Could not verify that Google sign-in');
  }

  if (!payload?.sub || !payload.email) {
    throw new UnauthorizedError('That Google account did not provide an email address');
  }

  if (!payload.email_verified) {
    throw new UnauthorizedError('That Google account has an unverified email address');
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    // Falls back to the local part of the address: `name` is a real name only
    // when the profile scope was granted, and our User model requires one.
    name: payload.name?.trim() || payload.email.split('@')[0] || 'Customer',
  };
};
