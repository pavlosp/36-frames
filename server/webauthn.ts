import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  GenerateAuthenticationOptionsOpts,
  GenerateRegistrationOptionsOpts,
  VerifyAuthenticationResponseOpts,
  VerifyRegistrationResponseOpts,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

// This should be the URL of your app
const rpID = process.env.RP_ID || "localhost";
const rpName = "36 Frames";
const origin = process.env.NODE_ENV === "production"
  ? `https://${rpID}`
  : `http://${rpID}:5000`;

/**
 * Generate options for registering a new authenticator
 */
export async function generateRegistration(
  user: { id: number; username: string; email: string },
  existingCredentials: Array<{ credentialID: string; transports?: string[] }> = []
): Promise<GenerateRegistrationOptionsOpts> {
  const opts: GenerateRegistrationOptionsOpts = {
    rpName,
    rpID,
    userID: user.id.toString(),
    userName: user.email,
    userDisplayName: user.username,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    excludeCredentials: existingCredentials.map(cred => ({
      id: isoBase64URL.toBuffer(cred.credentialID),
      type: 'public-key',
      transports: cred.transports as AuthenticatorTransport[],
    })),
  };

  return opts;
}

/**
 * Generate options for authenticating with an existing authenticator
 */
export async function generateAuthentication(
  existingCredentials: Array<{ credentialID: string; transports?: string[] }> = []
): Promise<GenerateAuthenticationOptionsOpts> {
  const opts: GenerateAuthenticationOptionsOpts = {
    rpID,
    allowCredentials: existingCredentials.map(cred => ({
      id: isoBase64URL.toBuffer(cred.credentialID),
      type: 'public-key',
      transports: cred.transports as AuthenticatorTransport[],
    })),
    userVerification: 'preferred',
  };

  return opts;
}

/**
 * Verify the registration response from the client
 */
export async function verifyRegistration(
  opts: VerifyRegistrationResponseOpts
): Promise<boolean> {
  const verification = await verifyRegistrationResponse({
    ...opts,
    expectedRPID: rpID,
    expectedOrigin: origin,
  });

  return verification.verified;
}

/**
 * Verify the authentication response from the client
 */
export async function verifyAuthentication(
  opts: VerifyAuthenticationResponseOpts
): Promise<boolean> {
  const verification = await verifyAuthenticationResponse({
    ...opts,
    expectedRPID: rpID,
    expectedOrigin: origin,
  });

  return verification.verified;
}
