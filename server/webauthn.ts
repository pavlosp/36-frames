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
  return generateRegistrationOptions({
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
  });
}

/**
 * Generate options for authenticating with an existing authenticator
 */
export async function generateAuthentication(
  existingCredentials: Array<{ credentialID: string; transports?: AuthenticatorTransport[] }> = []
): Promise<GenerateAuthenticationOptionsOpts> {
  return generateAuthenticationOptions({
    rpID,
    allowCredentials: existingCredentials.map(cred => ({
      id: Buffer.from(cred.credentialID, 'base64url'),
      type: 'public-key',
      transports: cred.transports,
    })),
    userVerification: 'preferred',
  });
}

/**
 * Verify the registration response from the client
 */
export async function verifyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<boolean> {
  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedRPID: rpID,
      expectedOrigin: origin,
      requireUserVerification: true,
    });

    return verification.verified;
  } catch (error) {
    console.error('Error verifying registration:', error);
    return false;
  }
}

/**
 * Verify the authentication response from the client
 */
export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  authenticator: {
    credentialID: Buffer;
    credentialPublicKey: Buffer;
    counter: number;
  }
): Promise<boolean> {
  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedRPID: rpID,
      expectedOrigin: origin,
      authenticator,
      requireUserVerification: true,
    });

    return verification.verified;
  } catch (error) {
    console.error('Error verifying authentication:', error);
    return false;
  }
}