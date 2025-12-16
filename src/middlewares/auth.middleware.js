import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js";

// custom (middleware -> jaate hue milke jaana) used between the routes
const verifyJWT = asyncHandler(async (req, res, next) => { // this will allow the main process only if the user is loggedIn
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if (!token || typeof token !== "string") {
            throw new ApiError(401, "Access token missing or invalid")
        }

        let decodedToken;
        try {
            decodedToken = jwt.verify(
                token,
                process.env.ACCESS_TOKEN_SECRET
            );
        } catch (err) {
            throw new ApiError(401, "Invalid or expired access token");
        }
        
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if (!user) {
            throw new ApiError(401, "Invalid access token")
        }
        req.user = user; // attaching .user with req it will give the access of that user who is logged in.
        next() // moves the control to next function of the route
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})

export {verifyJWT}