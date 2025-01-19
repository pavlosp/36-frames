import type { Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users, authenticators } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import {
  generateRegistration,
  generateAuthentication,
  verifyRegistration,
  verifyAuthentication,
} from "./webauthn";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

// extend express session with our custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    registration?: {
      userId: number;
      challenge: string;
    };
    authentication?: {
      userId: number;
      challenge: string;
    };
  }
}

// extend express user object with our schema
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      bio?: string | null;
    }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "secret-key-dev",
    resave: false,
    saveUninitialized: true,
    cookie: {},
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      secure: true,
    };
  }

  app.use(session(sessionSettings));

  // Generate registration options
  app.post("/api/auth/register-options", async (req, res) => {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).send("Username and email are required");
    }

    try {
      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Create new user
      const [user] = await db
        .insert(users)
        .values({
          username,
          email,
        })
        .returning();

      // Generate registration options
      const options = await generateRegistration(user);

      // Store challenge in session
      req.session.registration = {
        userId: user.id,
        challenge: options.challenge,
      };

      res.json(options);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error generating registration options");
    }
  });

  // Verify registration response
  app.post("/api/auth/register-verify", async (req, res) => {
    const registration = req.session.registration;
    if (!registration) {
      return res.status(400).send("No registration in progress");
    }

    try {
      const { userId, challenge } = registration;

      const verification = await verifyRegistration({
        response: req.body,
        expectedChallenge: challenge,
      });

      if (!verification) {
        return res.status(400).send("Invalid registration response");
      }

      const { credentialID, credentialPublicKey, counter } = req.body;

      // Save the new authenticator
      await db.insert(authenticators).values({
        userId,
        credentialID: isoBase64URL.fromBuffer(credentialID),
        credentialPublicKey: isoBase64URL.fromBuffer(credentialPublicKey),
        counter,
        credentialDeviceType: req.body.credentialDeviceType,
        credentialBackedUp: req.body.credentialBackedUp,
        transports: req.body.transports,
      });

      // Get the user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      // Log the user in
      req.session.userId = user.id;
      delete req.session.registration;

      res.json({
        message: "Registration successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          bio: user.bio,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error verifying registration");
    }
  });

  // Generate authentication options
  app.post("/api/auth/login-options", async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send("Email is required");
    }

    try {
      // Get user and their authenticators
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.status(400).send("User not found");
      }

      const userAuthenticators = await db
        .select()
        .from(authenticators)
        .where(eq(authenticators.userId, user.id));

      const options = await generateAuthentication(
        userAuthenticators.map(auth => ({
          credentialID: auth.credentialID,
          transports: auth.transports as any[], //Fixed type error here.  Assuming AuthenticatorTransport is defined elsewhere
        }))
      );

      req.session.authentication = {
        userId: user.id,
        challenge: options.challenge,
      };

      res.json(options);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error generating authentication options");
    }
  });

  // Verify authentication response
  app.post("/api/auth/login-verify", async (req, res) => {
    const authentication = req.session.authentication;
    if (!authentication) {
      return res.status(400).send("No authentication in progress");
    }

    try {
      const { userId, challenge } = authentication;

      // Get user's authenticator
      const [authenticator] = await db
        .select()
        .from(authenticators)
        .where(eq(authenticators.credentialID, req.body.id))
        .limit(1);

      if (!authenticator) {
        return res.status(400).send("Authenticator not found");
      }

      const verification = await verifyAuthentication({
        response: req.body,
        expectedChallenge: challenge,
        authenticator: {
          credentialID: isoBase64URL.toBuffer(authenticator.credentialID),
          credentialPublicKey: isoBase64URL.toBuffer(authenticator.credentialPublicKey),
          counter: authenticator.counter,
        },
      });

      if (!verification) {
        return res.status(400).send("Invalid authentication response");
      }

      // Update counter
      await db
        .update(authenticators)
        .set({ counter: req.body.newCounter })
        .where(eq(authenticators.id, authenticator.id));

      // Get the user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      // Log the user in
      req.session.userId = user.id;
      delete req.session.authentication;

      res.json({
        message: "Authentication successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          bio: user.bio,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error verifying authentication");
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).send("Not logged in");
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(401).send("User not found");
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error getting user");
    }
  });
}