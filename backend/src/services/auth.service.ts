import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import type { User, ServiceResult, GoogleUserInfo, JWTPayload } from "../types/index.js";
import { findUserByGoogleId, createUser, updatePushToken } from "./user.service.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

if (!GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID is not defined");
}

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Verify Google ID token and return user info
export async function verifyGoogleToken(idToken: string): Promise<ServiceResult<GoogleUserInfo>> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: GOOGLE_CLIENT_ID as string,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return { success: false, error: "Invalid token payload" };
    }

    // Extract user info from payload
    const email = payload.email;
    const googleId = payload.sub;
    const displayName = payload.name;
    const photoUrl = payload.picture;

    if (!email || !googleId) {
      return { success: false, error: "Missing required user information" };
    }

    // Check if email ends with @rutgers.edu
    if (!email.endsWith("rutgers.edu")) {
      return { success: false, error: "Must use rutgers.edu email" };
    }

    // Return Google user info
    const userInfo: GoogleUserInfo = {
      googleId,
      email,
      displayName: displayName || "",
    };

    if (photoUrl) {
      userInfo.photoUrl = photoUrl;
    }

    return {
      success: true,
      data: userInfo,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify Google token",
    };
  }
}

// Generate JWT token for the user
export function generateJWT(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
  };

  // Sign token with 30 day expiration
  const token = jwt.sign(payload, JWT_SECRET as string, { expiresIn: "30d" });

  return token;
}

// Verify JWT token and return decoded payload
export function verifyJWT(token: string): ServiceResult<JWTPayload> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as JWTPayload;

    return {
      success: true,
      data: decoded,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid or expired token",
    };
  }
}

/**
 * Main authentication function - verifies Google token and creates/updates user
 */
export async function authenticateWithGoogle(
  idToken: string,
  expoPushToken?: string
): Promise<ServiceResult<{ token: string; user: User }>> {
  try {
    // Verify Google token
    const verificationResult = await verifyGoogleToken(idToken);

    if (!verificationResult.success || !verificationResult.data) {
      return {
        success: false,
        error: verificationResult.error || "Failed to verify Google token",
      };
    }

    const googleUserInfo = verificationResult.data;

    // Check if user exists
    const existingUserResult = await findUserByGoogleId(googleUserInfo.googleId);

    if (!existingUserResult.success) {
      return {
        success: false,
        error: existingUserResult.error || "Failed to find user",
      };
    }

    let user: User;

    if (existingUserResult.data) {
      // User exists - update push token if provided
      user = existingUserResult.data;

      if (expoPushToken && expoPushToken !== user.expo_push_token) {
        const updateResult = await updatePushToken(user.id, expoPushToken);

        if (updateResult.success && updateResult.data) {
          user = updateResult.data;
        }
      }
    } else {
      // User doesn't exist - create new user
      const createUserResult = await createUser(googleUserInfo, expoPushToken);

      if (!createUserResult.success || !createUserResult.data) {
        return {
          success: false,
          error: createUserResult.error || "Failed to create user",
        };
      }

      user = createUserResult.data;
    }

    // Generate JWT token
    const token = generateJWT(user);

    return {
      success: true,
      data: {
        token,
        user,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}
