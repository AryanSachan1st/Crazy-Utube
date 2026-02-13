import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

/**
 * Middleware: verifyJWT
 * Purpose: Verifies the incoming request's Access Token to ensure the user is authenticated.
 * 
 * Why try-catch inside asyncHandler?
 * - `asyncHandler` catches any *unexpected* errors (like database connection failures) 
 *   and passes them to Express.
 * - `try-catch` here allows us to handle *specific* authentication errors (like invalid token logic)
 *   and transform them into a standardized `ApiError` format (401 Unauthorized) with a clear message.
 */
export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        // 1. Retrieve the token from cookies or the Authorization header
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        // 2. If no token is found, throw an error immediately
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        // 3. Verify the token using the secret key
        // If verification fails (expired/invalid), jwt.verify throws an error, 
        // which is caught by the catch block below.
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // 4. Find the user in the database using the ID from the decoded token
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        // 5. If token is valid but user doesn't exist (e.g., deleted account), throw error
        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        // 6. Attach the user object to the request object
        // This allows subsequent route handlers to access the authenticated user's details via `req.user`
        req.user = user;
        
        // 7. Proceed to the next middleware or route handler
        next();
    } catch (error) {
        // Catch any error (JWT verification failure, DB error, etc.)
        // and throw a standardized 401 ApiError.
        // Because of asyncHandler, this thrown error will be passed to Express's global error handler.
        throw new ApiError(401, error?.message || "Invalid access token");
        // next(error) // call it explicitly - if we do not use asyncHandler
        // Throw a 401 Unauthorized error. If the original error has a specific message (like 'jwt expired'), use that. Otherwise, just say 'Invalid access token'
    }
});
// So, Try-Catch inside auth.middleware.js catches all types of errors and pass them to the asyncHandler where that error is sent to Express using Promise.catch((error) => next(error))