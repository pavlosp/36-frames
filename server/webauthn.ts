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
  AuthenticatorTransport,
} from "@simplewebauthn/server";

// Get the domain from the environment
console.log("domain", process.env.DOMAIN);
console.log("environment", process.env.REPL_ENVIRONMENT);
console.log("slug", process.env.REPL_SLUG);

const host = process.env.REPL_SLUG
  ? process.env.REPL_ENVIRONMENT === "development"
    ? process.env.REPL_HOST
    : `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
  : "localhost";

// For development, use replit.dev to allow all subdomains
const rpID =
  process.env.REPL_ENVIRONMENT === "development" || host.includes(".replit.dev")
    ? "replit.dev" // Allow all *.replit.dev subdomains in development
    : host.split(":")[0]; // Remove port if present

const rpName = "36 Frames";
const origin = process.env.REPL_SLUG
  ? `https://${host}`
  : `http://${host}:5000`;

console.log("WebAuthn Configuration:", { rpID, origin, host });

/**
 * Generate options for registering a new authenticator
 */
export async function generateRegistration(
  user: { id: number; username: string; email: string },
  existingCredentials: Array<{
    credentialID: string;
    transports?: AuthenticatorTransport[];
  }> = [],
): Promise<GenerateRegistrationOptionsOpts> {
  // Convert user ID to Uint8Array
  const userIdBytes = new TextEncoder().encode(user.id.toString());

  try {
    const isDevelopment =
      process.env.REPL_ENVIRONMENT === "development" ||
      host.includes(".replit.dev");
    const effectiveRpID = isDevelopment ? "replit.dev" : rpID;

    console.log("Generating registration options with:", {
      rpID: effectiveRpID,
      origin,
      isDevelopment,
    });

    const options = await generateRegistrationOptions({
      rpName,
      rpID: effectiveRpID, // Use development rpID from the start
      userID: userIdBytes,
      userName: user.email,
      userDisplayName: user.username,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      excludeCredentials: existingCredentials.map((cred) => ({
        id: Buffer.from(cred.credentialID, "base64url"),
        type: "public-key",
        transports: cred.transports,
      })),
    });

    console.log("Generated registration options:", {
      rpID: options.rp.id,
      origin,
      challenge: options.challenge ? "[present]" : "[missing]",
    });

    return options;
  } catch (error) {
    console.error("Error generating registration options:", error);
    throw error;
  }
}

/**
 * Generate options for authenticating with an existing authenticator
 */
export async function generateAuthentication(
  existingCredentials: Array<{
    credentialID: string;
    transports?: AuthenticatorTransport[];
  }> = [],
): Promise<GenerateAuthenticationOptionsOpts> {
  try {
    const isDevelopment =
      process.env.REPL_ENVIRONMENT === "development" ||
      host.includes(".replit.dev");
    const effectiveRpID = isDevelopment ? "replit.dev" : rpID;

    console.log("Generating authentication options with:", {
      rpID: effectiveRpID,
      origin,
      isDevelopment,
    });

    const options = await generateAuthenticationOptions({
      timeout: 60000,
      rpID: effectiveRpID, // Use development rpID from the start
      allowCredentials: existingCredentials.map((cred) => ({
        id: Buffer.from(cred.credentialID, "base64url"),
        type: "public-key",
        transports: cred.transports,
      })),
      userVerification: "preferred",
    });

    console.log("Generated authentication options:", {
      rpID: options.rpId,
      origin,
      challenge: options.challenge ? "[present]" : "[missing]",
    });

    return options;
  } catch (error) {
    console.error("Error generating authentication options:", error);
    throw error;
  }
}

/**
 * Verify the registration response from the client
 */
export async function verifyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string,
): Promise<boolean> {
  try {
    const isDevelopment =
      process.env.REPL_ENVIRONMENT === "development" ||
      host.includes(".replit.dev");
    const effectiveRpID = isDevelopment ? "replit.dev" : rpID;

    console.log("Verifying registration with:", {
      rpID: effectiveRpID,
      origin,
      expectedChallenge: expectedChallenge ? "[present]" : "[missing]",
    });

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedRPID: effectiveRpID,
      expectedOrigin: origin,
      requireUserVerification: true,
    });

    return verification.verified;
  } catch (error) {
    console.error("Error verifying registration:", error);
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
  },
): Promise<boolean> {
  try {
    const isDevelopment =
      process.env.REPL_ENVIRONMENT === "development" ||
      host.includes(".replit.dev");
    const effectiveRpID = isDevelopment ? "replit.dev" : rpID;

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedRPID: effectiveRpID,
      expectedOrigin: origin,
      authenticator,
      requireUserVerification: true,
    });

    return verification.verified;
  } catch (error) {
    console.error("Error verifying authentication:", error);
    return false;
  }
}
