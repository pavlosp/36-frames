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
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
  AuthenticatorTransport
} from "@simplewebauthn/server";

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
  existingCredentials: Array<{ credentialID: string; transports?: AuthenticatorTransport[] }> = []
): Promise<GenerateRegistrationOptionsOpts> {
  return {
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
      id: Buffer.from(cred.credentialID, 'base64url'),
      type: 'public-key',
      transports: cred.transports,
    })),
  };
}

/**
 * Generate options for authenticating with an existing authenticator
 */
export async function generateAuthentication(
  existingCredentials: Array<{ credentialID: string; transports?: AuthenticatorTransport[] }> = []
): Promise<GenerateAuthenticationOptionsOpts> {
  return {
    rpID,
    allowCredentials: existingCredentials.map(cred => ({
      id: Buffer.from(cred.credentialID, 'base64url'),
      type: 'public-key',
      transports: cred.transports,
    })),
    userVerification: 'preferred',
  };
}

/**
 * Verify the registration response from the client
 */
export async function verifyRegistration(
  opts: Pick<VerifyRegistrationResponseOpts, 'response' | 'expectedChallenge'>
): Promise<boolean> {
  const verification = await verifyRegistrationResponse({
    ...opts,
    expectedRPID: rpID,
    expectedOrigin: origin,
    requireUserVerification: true,
  });

  return verification.verified;
}

/**
 * Verify the authentication response from the client
 */
export async function verifyAuthentication(
  opts: Pick<VerifyAuthenticationResponseOpts, 'response' | 'expectedChallenge'> & {
    authenticator: {
      credentialID: Buffer;
      credentialPublicKey: Buffer;
      counter: number;
    };
  }
): Promise<boolean> {
  const verification = await verifyAuthenticationResponse({
    response: opts.response as AuthenticationResponseJSON,
    expectedChallenge: opts.expectedChallenge,
    expectedRPID: rpID,
    expectedOrigin: origin,
    authenticator: opts.authenticator,
    requireUserVerification: true,
  });

  return verification.verified;
}