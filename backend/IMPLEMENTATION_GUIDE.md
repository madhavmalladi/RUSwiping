# Backend Implementation Guide

This guide walks you through implementing the backend for RUSwiping step-by-step. Since this is your first Node.js/Express backend, I'll explain the concepts as we go.

---

## Understanding the Architecture

Before coding, here's how Express backends work:

```
Request → Routes → Controllers → Services → Database
                                    ↓
Response ← Controllers ← Services ←
```

- **Routes**: Define URL endpoints (e.g., `/api/auth/google`)
- **Controllers**: Handle HTTP requests/responses, validate input
- **Services**: Contain business logic, interact with database
- **Middleware**: Functions that run before your routes (auth checks, error handling)
- **Types**: TypeScript interfaces that define data shapes

---

## Implementation Order

Follow this order - each file builds on the previous:

| Order | File | Why First? |
|-------|------|-----------|
| 1 | `src/types/index.ts` | Everything depends on type definitions |
| 2 | `src/config/supabase.ts` | Database client needed by all services |
| 3 | `src/middleware/error-handler.ts` | Catch errors before server crashes |
| 4 | `src/services/dining-hall.service.ts` | Simplest service, good practice |
| 5 | `src/services/user.service.ts` | Needed by auth service |
| 6 | `src/services/auth.service.ts` | Core authentication logic |
| 7 | `src/middleware/auth.ts` | Protect routes using auth service |
| 8 | `src/controllers/auth.controller.ts` | Handle auth HTTP requests |
| 9 | `src/routes/auth.routes.ts` | Define auth endpoints |
| 10 | `src/index.ts` | Wire everything together |

Then continue with swipe, matching, message services/controllers/routes.

---

## File 1: Types (FULL CODE)

This file defines all your TypeScript interfaces. Copy this exactly.

**File: `src/types/index.ts`**

```typescript
// ============================================
// DATABASE TYPES (match your PostgreSQL schema)
// ============================================

/**
 * Dining hall information from the dining_halls table
 */
export interface DiningHall {
  id: string;
  name: string;
  campus: string;
  weekday_open_time: string;  // "07:00:00"
  weekday_close_time: string;
  friday_open_time: string;
  friday_close_time: string;
  weekend_open_time: string;
  weekend_close_time: string;
  is_active: boolean;
  created_at: string;
}

/**
 * User from the users table
 */
export interface User {
  id: string;
  google_id: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  expo_push_token: string | null;
  created_at: string;
  last_online: string;
}

/**
 * Swipe offer from swipe_offers table
 * Someone who CAN give a swipe
 */
export interface SwipeOffer {
  id: string;
  user_id: string;
  dining_hall_id: string;
  available_from: string;  // ISO timestamp
  available_until: string;
  is_active: boolean;
  created_at: string;
  // Populated via joins
  dining_hall?: DiningHall;
  user?: User;
}

/**
 * Swipe request from swipe_requests table
 * Someone who NEEDS a swipe
 */
export interface SwipeRequest {
  id: string;
  user_id: string;
  dining_hall_id: string;
  requested_at: string;
  is_active: boolean;
  created_at: string;
  // Populated via joins
  dining_hall?: DiningHall;
  user?: User;
}

/**
 * Match from matches table
 * Created when offer meets request
 */
export interface Match {
  id: string;
  giver_id: string;
  receiver_id: string;
  dining_hall_id: string;
  offer_id: string | null;
  request_id: string | null;
  created_at: string;
  is_completed: boolean;
  // Populated via joins
  dining_hall?: DiningHall;
  giver?: User;
  receiver?: User;
}

/**
 * Message from messages table
 */
export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  // Populated via joins
  sender?: User;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/**
 * POST /api/auth/google request body
 */
export interface GoogleAuthRequest {
  idToken: string;
  expoPushToken?: string;
}

/**
 * POST /api/auth/google response
 */
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * POST /api/swipes/offer request body
 */
export interface CreateOfferRequest {
  diningHallId: string;
  availableFrom: string;  // ISO timestamp
  availableUntil: string;
}

/**
 * POST /api/swipes/request request body
 */
export interface CreateRequestRequest {
  diningHallId: string;
}

/**
 * POST /api/matches/:matchId/messages request body
 */
export interface SendMessageRequest {
  text: string;
}

// ============================================
// JWT PAYLOAD TYPE
// ============================================

/**
 * What we store in the JWT token
 */
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;  // Issued at (added by jsonwebtoken)
  exp?: number;  // Expiration (added by jsonwebtoken)
}

// ============================================
// EXPRESS EXTENSION
// ============================================

/**
 * Extend Express Request to include our user
 * This lets us do req.user after auth middleware
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// ============================================
// SERVICE RESPONSE TYPES
// ============================================

/**
 * Standard service result wrapper
 * Services return this to indicate success/failure
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Google OAuth payload after token verification
 */
export interface GoogleUserInfo {
  googleId: string;
  email: string;
  displayName: string;
  photoUrl?: string;
}
```

---

## File 2: Supabase Config (PSEUDOCODE)

**File: `src/config/supabase.ts`**

**Purpose**: Create a single Supabase client instance that all services use.

```typescript
// PSEUDOCODE - Implement this yourself

// 1. Import createClient from @supabase/supabase-js
// 2. Import dotenv and call config() to load .env file

// 3. Get SUPABASE_URL from process.env
//    - Throw error if not defined

// 4. Get SUPABASE_SERVICE_ROLE_KEY from process.env
//    - Throw error if not defined
//    - Note: We use SERVICE_ROLE_KEY (not anon key) because backend
//      needs full database access

// 5. Create the supabase client:
//    const supabase = createClient(url, key)

// 6. Export the supabase client as default export

// HINTS:
// - createClient takes 2 arguments: url and key
// - Use: import { createClient } from '@supabase/supabase-js'
// - Access env vars: process.env.VARIABLE_NAME
// - Throw errors: throw new Error('message')
```

**Test it works**: After implementing, you can test by adding this temporarily:
```typescript
// At bottom of file, add temporarily:
supabase.from('dining_halls').select('*').then(console.log);
```
Then run `npx ts-node src/config/supabase.ts` - you should see dining halls.

---

## File 3: Error Handler Middleware (PSEUDOCODE)

**File: `src/middleware/error-handler.ts`**

**Purpose**: Catch any errors thrown in routes/services and return proper JSON responses instead of crashing.

```typescript
// PSEUDOCODE - Implement this yourself

// 1. Import Request, Response, NextFunction from 'express'

// 2. Create a custom error class called AppError:
//    - Extends the built-in Error class
//    - Has a statusCode property (number)
//    - Has a isOperational property (boolean, default true)
//    - Constructor takes: message (string), statusCode (number)
//
//    HINT for class syntax:
//    export class AppError extends Error {
//      constructor(message: string, statusCode: number) {
//        super(message);  // Call parent constructor
//        this.statusCode = statusCode;
//      }
//    }

// 3. Create the error handler middleware function:
//    - Express error handlers have 4 parameters: (err, req, res, next)
//    - TypeScript signature:
//      (err: Error, req: Request, res: Response, next: NextFunction)
//
//    Inside the function:
//    a. Log the error for debugging: console.error('Error:', err)
//
//    b. Check if err is an instance of AppError (our custom class)
//       - If yes: use its statusCode and message
//       - If no: use 500 and 'Internal server error'
//
//    c. Send JSON response:
//       res.status(statusCode).json({
//         success: false,
//         error: message
//       })

// 4. Export both AppError and errorHandler

// EXAMPLE USAGE (in routes later):
// throw new AppError('User not found', 404);
// throw new AppError('Invalid email format', 400);
```

---

## File 4: Dining Hall Service (PSEUDOCODE)

**File: `src/services/dining-hall.service.ts`**

**Purpose**: Fetch dining halls from the database. This is the simplest service - good practice before harder ones.

```typescript
// PSEUDOCODE - Implement this yourself

// 1. Import supabase from '../config/supabase'
// 2. Import DiningHall, ServiceResult from '../types'

// 3. Create an async function: getAllDiningHalls
//    - Returns: Promise<ServiceResult<DiningHall[]>>
//
//    Inside:
//    a. Query supabase for all dining_halls where is_active = true
//       HINT: supabase.from('table_name').select('*').eq('column', value)
//
//    b. If there's an error from supabase:
//       return { success: false, error: error.message }
//
//    c. If successful:
//       return { success: true, data: data }
//
//    SUPABASE QUERY HINTS:
//    - .from('dining_halls') - select the table
//    - .select('*') - get all columns
//    - .eq('is_active', true) - filter where is_active = true
//    - Returns: { data, error } - destructure this

// 4. Create an async function: getDiningHallById
//    - Parameter: id (string)
//    - Returns: Promise<ServiceResult<DiningHall>>
//
//    Inside:
//    a. Query supabase for single dining_hall by id
//       HINT: .select('*').eq('id', id).single()
//       The .single() returns one record instead of array
//
//    b. Handle error case
//    c. Handle not found case (data is null)
//    d. Return success with data

// 5. Export both functions (named exports)

// TESTING TIP:
// Create a test file or add to bottom temporarily:
// getAllDiningHalls().then(result => console.log(result));
```

---

## File 5: User Service (PSEUDOCODE)

**File: `src/services/user.service.ts`**

**Purpose**: Create and find users in the database.

```typescript
// PSEUDOCODE - Implement this yourself

// 1. Import supabase from '../config/supabase'
// 2. Import User, ServiceResult, GoogleUserInfo from '../types'

// 3. Create async function: findUserByGoogleId
//    - Parameter: googleId (string)
//    - Returns: Promise<ServiceResult<User | null>>
//
//    Query users table where google_id equals googleId
//    Use .maybeSingle() instead of .single() - this returns null
//    instead of error when not found

// 4. Create async function: findUserById
//    - Parameter: id (string)
//    - Returns: Promise<ServiceResult<User | null>>
//
//    Similar to above but query by id column

// 5. Create async function: createUser
//    - Parameter: googleUserInfo (GoogleUserInfo), expoPushToken (optional string)
//    - Returns: Promise<ServiceResult<User>>
//
//    a. Build the user object to insert:
//       {
//         google_id: googleUserInfo.googleId,
//         email: googleUserInfo.email,
//         display_name: googleUserInfo.displayName,
//         photo_url: googleUserInfo.photoUrl,
//         expo_push_token: expoPushToken (or null if not provided)
//       }
//
//    b. Insert into users table
//       HINT: supabase.from('users').insert(userData).select().single()
//       The .select() returns the inserted row
//
//    c. Handle error and success cases

// 6. Create async function: updateUser
//    - Parameters: id (string), updates (Partial<User>)
//    - Returns: Promise<ServiceResult<User>>
//
//    HINT: supabase.from('users').update(updates).eq('id', id).select().single()

// 7. Create async function: updatePushToken
//    - Parameters: userId (string), token (string)
//    - Returns: Promise<ServiceResult<User>>
//
//    Just calls updateUser with { expo_push_token: token }

// 8. Export all functions
```

---

## File 6: Auth Service (PSEUDOCODE)

**File: `src/services/auth.service.ts`**

**Purpose**: Verify Google tokens, check @rutgers.edu email, create/find users, generate JWT.

```typescript
// PSEUDOCODE - Implement this yourself

// 1. Imports:
//    - OAuth2Client from 'google-auth-library'
//    - jwt from 'jsonwebtoken'
//    - User, ServiceResult, GoogleUserInfo, JWTPayload from '../types'
//    - findUserByGoogleId, createUser, updatePushToken from './user.service'

// 2. Get environment variables:
//    - GOOGLE_CLIENT_ID (throw error if not defined)
//    - JWT_SECRET (throw error if not defined)

// 3. Create Google OAuth client:
//    const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// 4. Create async function: verifyGoogleToken
//    - Parameter: idToken (string)
//    - Returns: Promise<ServiceResult<GoogleUserInfo>>
//
//    a. Call googleClient.verifyIdToken({
//         idToken: idToken,
//         audience: GOOGLE_CLIENT_ID
//       })
//
//    b. Get the payload: const payload = ticket.getPayload()
//       If no payload, return error
//
//    c. Extract user info from payload:
//       - payload.sub = Google ID
//       - payload.email = email
//       - payload.name = display name
//       - payload.picture = photo URL
//
//    d. IMPORTANT: Check email ends with @rutgers.edu
//       if (!email.endsWith('@rutgers.edu')) {
//         return { success: false, error: 'Must use @rutgers.edu email' }
//       }
//
//    e. Return success with GoogleUserInfo object
//
//    f. Wrap everything in try/catch - Google verification can throw

// 5. Create function: generateJWT
//    - Parameter: user (User)
//    - Returns: string
//
//    a. Create payload: { userId: user.id, email: user.email }
//    b. Sign with jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
//    c. Return the token

// 6. Create function: verifyJWT
//    - Parameter: token (string)
//    - Returns: ServiceResult<JWTPayload>
//
//    a. Try to verify: jwt.verify(token, JWT_SECRET) as JWTPayload
//    b. Return success with decoded payload
//    c. Catch errors and return failure

// 7. Create async function: authenticateWithGoogle
//    - Parameters: idToken (string), expoPushToken (optional string)
//    - Returns: Promise<ServiceResult<{ token: string, user: User }>>
//
//    This is the main function that ties everything together:
//
//    a. Call verifyGoogleToken(idToken)
//       If failed, return the error
//
//    b. Call findUserByGoogleId(googleUserInfo.googleId)
//
//    c. If user exists:
//       - If expoPushToken provided, update it
//       - Generate JWT for existing user
//       - Return { token, user }
//
//    d. If user doesn't exist:
//       - Call createUser(googleUserInfo, expoPushToken)
//       - Generate JWT for new user
//       - Return { token, user }
//
//    e. Handle any errors

// 8. Export: verifyGoogleToken, generateJWT, verifyJWT, authenticateWithGoogle
```

---

## File 7: Auth Middleware (PSEUDOCODE)

**File: `src/middleware/auth.ts`**

**Purpose**: Protect routes by verifying JWT token from Authorization header.

```typescript
// PSEUDOCODE - Implement this yourself

// 1. Import Request, Response, NextFunction from 'express'
// 2. Import verifyJWT from '../services/auth.service'
// 3. Import AppError from './error-handler'

// 4. Create the authMiddleware function:
//    - Parameters: (req: Request, res: Response, next: NextFunction)
//    - Returns: void
//
//    a. Get the Authorization header:
//       const authHeader = req.headers.authorization;
//
//    b. Check if header exists and starts with 'Bearer ':
//       if (!authHeader || !authHeader.startsWith('Bearer ')) {
//         throw new AppError('No token provided', 401);
//       }
//
//    c. Extract the token (remove 'Bearer ' prefix):
//       const token = authHeader.split(' ')[1];
//
//    d. Verify the token using verifyJWT(token)
//
//    e. If verification failed:
//       throw new AppError('Invalid or expired token', 401);
//
//    f. If successful, attach user to request:
//       req.user = result.data;  // This is the JWTPayload
//
//    g. Call next() to continue to the route handler

// 5. Export authMiddleware as default export

// USAGE IN ROUTES:
// router.get('/protected-route', authMiddleware, (req, res) => {
//   // req.user is now available with userId and email
//   console.log(req.user.userId);
// });
```

---

## File 8: Auth Controller (PSEUDOCODE)

**File: `src/controllers/auth.controller.ts`**

**Purpose**: Handle HTTP requests for authentication endpoints.

```typescript
// PSEUDOCODE - Implement this yourself

// 1. Import Request, Response, NextFunction from 'express'
// 2. Import authenticateWithGoogle from '../services/auth.service'
// 3. Import AppError from '../middleware/error-handler'

// 4. Create async function: googleAuth
//    - Parameters: (req: Request, res: Response, next: NextFunction)
//
//    a. Extract idToken and expoPushToken from req.body
//       const { idToken, expoPushToken } = req.body;
//
//    b. Validate idToken exists:
//       if (!idToken) {
//         return next(new AppError('idToken is required', 400));
//       }
//
//    c. Call authenticateWithGoogle(idToken, expoPushToken)
//
//    d. If failed, pass error to next():
//       return next(new AppError(result.error, 401));
//
//    e. If successful, return JSON response:
//       res.json({
//         success: true,
//         token: result.data.token,
//         user: result.data.user
//       });
//
//    f. Wrap in try/catch, pass errors to next(error)

// 5. Create async function: getMe
//    - This returns the current user's info based on their JWT
//    - Parameters: (req: Request, res: Response, next: NextFunction)
//
//    a. Get userId from req.user (set by auth middleware)
//       const userId = req.user?.userId;
//
//    b. If no userId, return error
//
//    c. Call findUserById(userId) from user service
//
//    d. Return user data
//
//    NOTE: This route will use authMiddleware, so req.user exists

// 6. Export googleAuth, getMe
```

---

## File 9: Auth Routes (PSEUDOCODE)

**File: `src/routes/auth.routes.ts`**

**Purpose**: Define the URL endpoints for authentication.

```typescript
// PSEUDOCODE - Implement this yourself

// 1. Import Router from 'express'
// 2. Import googleAuth, getMe from '../controllers/auth.controller'
// 3. Import authMiddleware from '../middleware/auth'

// 4. Create the router:
//    const router = Router();

// 5. Define routes:
//
//    POST /google - Login with Google (public route)
//    router.post('/google', googleAuth);
//
//    GET /me - Get current user (protected route)
//    router.get('/me', authMiddleware, getMe);

// 6. Export router as default

// EXPLANATION:
// - Router() creates a mini-router that we'll mount at /api/auth
// - router.post('/google', handler) means POST /api/auth/google
// - Adding authMiddleware before getMe means JWT is required
```

---

## File 10: Main Server (PSEUDOCODE)

**File: `src/index.ts`**

**Purpose**: The entry point - wire everything together and start the server.

```typescript
// PSEUDOCODE - Implement this yourself

// 1. Imports:
//    - express from 'express'
//    - cors from 'cors'
//    - dotenv from 'dotenv'
//    - errorHandler from './middleware/error-handler'
//    - authRoutes from './routes/auth.routes'
//    (Add more route imports as you build them)

// 2. Load environment variables:
//    dotenv.config();

// 3. Create Express app:
//    const app = express();

// 4. Get PORT from env or default to 3000:
//    const PORT = process.env.PORT || 3000;

// 5. Apply middleware:
//    app.use(cors());           // Allow cross-origin requests
//    app.use(express.json());   // Parse JSON request bodies

// 6. Health check endpoint (for Docker/monitoring):
//    app.get('/health', (req, res) => {
//      res.json({ status: 'ok', timestamp: new Date().toISOString() });
//    });

// 7. Mount route modules:
//    app.use('/api/auth', authRoutes);
//    // Later add:
//    // app.use('/api/dining-halls', diningHallRoutes);
//    // app.use('/api/swipes', swipeRoutes);
//    // app.use('/api/matches', matchRoutes);

// 8. Error handler (MUST be last middleware):
//    app.use(errorHandler);

// 9. Start server:
//    app.listen(PORT, () => {
//      console.log(`Server running on port ${PORT}`);
//    });

// RUNNING THE SERVER:
// Add this to package.json scripts:
//   "dev": "ts-node-dev --respawn --transpile-only src/index.ts"
// Then run: npm run dev
```

---

## Testing Your Implementation

After implementing files 1-10, test with these commands:

```bash
# 1. Start the server
npm run dev

# 2. Test health endpoint (should return { status: 'ok' })
curl http://localhost:3000/health

# 3. Test auth endpoint without token (should return error)
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "fake-token"}'
```

---

## Next Steps

After completing these 10 files, continue with:

1. **Dining Hall Controller & Routes** - Similar pattern to auth
2. **Swipe Service** - Create/cancel offers and requests
3. **Matching Service** - The core algorithm (see main plan)
4. **Notification Service** - Push notifications via Expo
5. **Message Service** - Chat functionality
6. **Remaining Controllers & Routes**

Each follows the same pattern: **Service → Controller → Routes**.

---

## Common Mistakes to Avoid

1. **Forgetting async/await** - Database calls are async, always await them
2. **Not handling errors** - Always check `if (error)` from Supabase
3. **Wrong import paths** - Use `./` for same directory, `../` to go up
4. **Forgetting to export** - Functions must be exported to use elsewhere
5. **Missing middleware order** - Error handler must be LAST
6. **Env variables undefined** - Make sure .env file exists and has all values

---

## Quick Reference: Supabase Queries

```typescript
// SELECT all
const { data, error } = await supabase.from('table').select('*');

// SELECT with filter
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('column', value);

// SELECT single row
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('id', id)
  .single();

// INSERT
const { data, error } = await supabase
  .from('table')
  .insert({ column: value })
  .select()
  .single();

// UPDATE
const { data, error } = await supabase
  .from('table')
  .update({ column: newValue })
  .eq('id', id)
  .select()
  .single();

// DELETE
const { error } = await supabase
  .from('table')
  .delete()
  .eq('id', id);
```

Good luck! Start with File 1 (which I've given you the complete code for), then work through the pseudocode files one by one.
