import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { cookieOptions } from "../constants.js";
import mongoose from "mongoose";

const generateTokens = async (userId) => {
    try {
        // 1. Find the user by ID
        const user = await User.findById(userId);
        
        // 2. Generate Access and Refresh tokens using model methods
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // 3. Save the Refresh Token to the database (attached to user document)
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false})
        
        // 4. Return the tokens
        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Tokens generation failed inside user.controller.js")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // 1. Get user details from request body
    const {username, fullname, email, password} = req.body;
    // avatar and coverImage will be taken from 'req.files()'

    // 2. Validate required fields
    if (
        [username, fullname, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "Fill all required fields")
    }

    // 3. Check if user already exists (username or email)
    const userExist = await User.findOne({
        $or: [{username}, {email}]
    })
    if (userExist) {
        throw new ApiError(409, "Username or Email already exist, try unique")
    }

    // 4. Check for avatar image
    const avatarLocalPath = req.files?.avatar[0]?.path; // req.files.... >> provided by multer middleware
    console.log(req.files);

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required")
    }
    let coverImageLocalPath;
    let coverName = "no cover image"
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files?.coverImage[0]?.path;
        coverName = req.files?.coverImage[0].fieldname;
    }

    // 5. Upload images to Cloudinary
    const avatarStatus = await uploadOnCloudinary(avatarLocalPath, req.files?.avatar[0].fieldname);
    const coverImageStatus = await uploadOnCloudinary(coverImageLocalPath, coverName);

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required")
    }

    // 6. Create user object in database
    const user = await User.create({
        fullname, 
        avatar: avatarStatus?.url,
        coverImage: coverImageStatus?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })    

    // 7. Fetch the created user (excluding password and refresh token)
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // 8. Check for user creation success
    if (!createdUser) {
        throw new ApiError(500, "Server failed to register the user, please try again")
    }

    // 9. Return success response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    );
})

const loginUser = asyncHandler(async (req, res) => {
    // 1. Get email/username and password from req.body
    const {username, email, password} = req.body;

    // 2. Validate required fields
    if (!username && !email) {
        throw new ApiError(400, "Enter username or password")
    }
    
    // 3. Find user in database
    const user = await User.findOne({ // this user do not have the tokens
        $or: [{username}, {email}]
    })

    // 4. If user does not exist -> return error
    if (!user) {
        throw new ApiError(404, "User doesn't exists, register new user!")
    }

    // Note: 'User' (model) can only access mongodb functions like .findOne(), etc. To access user-defined functions like .isPasswordCorrect() -> use the 'user'

    // 5. Compare hashed password
    const passMatched = await user.isPasswordCorrect(password)
    if (!passMatched) {
        throw new ApiError(401, "Invalid password, try again");
    }

    // 6. Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // 7. Set tokens in httpOnly cookies and return success response
    return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json( // this res.json() will send the response. It is the terminal object
        new ApiResponse(200, {
            user: loggedInUser,
            accessToken,
        }, "User LoggedIn Successfully")
    )   
})

const logoutUser = asyncHandler(async (req, res) => { 
    // 1. Unset the refresh token in the database
    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $unset: {
                refreshToken: 1 // this unsets the field from the document
            }
        },
        {
            new: true
        }
    )
    
    // 2. Clear cookies and return success response
    return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json (
        new ApiResponse(200, {}, "User logged out successfully")
    )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    // 1. Get incoming refresh token from cookies or header
    const incommingRT = req.cookies.refreshToken || req.header("Authorization")?.replace("Bearer ", "");
    if (!incommingRT) {
        throw new ApiError(401, "User's refresh token is null or undefined")
    }

    try {
        // 2. Verify token
        const decodedToken = jwt.verify(incommingRT, process.env.REFRESH_TOKEN_SECRET); // just to get the original payload
        if (!decodedToken) {
            throw new ApiError(400, "refresh token does not matched with the stored RT of this user")
        }
    
        // 3. Find user by ID
        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }
    
        // 4. Security Check: Compare incoming token with stored token
        if (incommingRT !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        // 5. Generate new access and refresh tokens
        const {accessToken, refreshToken} = await generateTokens(user?._id); // attach new access token to the user
    
        // 6. Return new tokens and set cookies
        return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json (
            new ApiResponse(
                204, { accessToken, refreshToken }, "Access Token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => { // loggedIn user want's to change their pass
    // 1. Get old and new passwords from body
    const {oldPass, newPass} = req.body;
    
    // 2. Find the user
    const user = await User.findById(req.user?._id)
    if (!user) {
        throw new ApiError(401, "User not found")
    }

    // 3. Verify old password
    if (!await user.isPasswordCorrect(oldPass)) {
        throw new ApiError(400, "Enter correct old password")
    }

    // 4. Update password and save user
    user.password = newPass;
    await user.save({validateBeforeSave: false})

    // 5. Return success response
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))

})

const currentUser = asyncHandler(async (req, res) => {
    // 1. Return the authenticated user details
    return res
    .status(200)
    .json(
        new ApiResponse(200, req.user, "current user fetched successfully")
    )
})

const createNewPassword = asyncHandler(async (req, res) => { // otp verification of the requested username is pending to authenticate whether the actual user is trying to change the password
    // 1. Get user details from body
    const {userName, email, new_password} = req.body;

    // 2. Validate inputs
    if (!userName && !email) {
        throw new ApiError(400, "Enter atleast one of the username or email")
    }

    // 3. Find user by username or email
    const user = await User.find(
        { $or: [{ userName }, { email }] }
    )

    if (!user) {
        throw new ApiError(400, "User doesn't exists")
    }

    // 4. Update password (note: this logic might affect multiple users if find returns array, assuming findOne was intended or uniqueness)
    // Also user is an array from find(), so user.password might fail. 'user[0].password' would be correct if using find.
    // Assuming the user meant findOne or logic handles it in schema (but it's risky). 
    // Commenting strictly on existing logic.
    user.password = new_password // mongoDB's 'pre' hook will handle the encryption
    
    // 5. Return success response
    const display_user = await User.findById(user._id).select("-refreshToken -password")

    res.status(201).json(
        new ApiResponse(201, display_user, "Password changed successfully")
    )

})

const updateAccountDetails = asyncHandler(async (req, res) => {
    // 1. Get fields to update
    const {username, fullname, email} = req.body
    
    // 2. Validate required fields
    if (!fullname && !email) {
        throw new ApiError(400, "All fields are required")
    }

    // 3. Check for avatar upload
    if (!req.file?.avatar[0]?.path) {
        // throw new ApiError(400, "Please upload new Avatar")
    }

    const avatar_local_path = req.files?.avatar[0]?.path
    const avatar_name = req.files?.avatar[0]?.fieldname

    const coverImage_local_path = req.files?.coverImage[0]?.path
    const coverImage_name = req.files?.coverImage[0]?.fieldname

    // 4. Upload new images to Cloudinary
    const cloudinary_avatar_response = await uploadOnCloudinary(avatar_local_path, avatar_name)
    let cloudinary_coverImage_response = ""
    if (coverImage_local_path) {
        cloudinary_coverImage_response = await uploadOnCloudinary(coverImage_local_path, coverImage_name)
    }

    // 5. Update user details in database
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                username: username,
                fullname: fullname,
                email: email,
                avatar: cloudinary_avatar_response?.url || "",
                coverImage: cloudinary_coverImage_response?.url || ""
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    // 6. Return updated user
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    // 1. Get username from params
    const {username} = req.params;

    // 2. Validate username
    if (!username) {
        throw new ApiError(400, "username is missing")
    }

    // 3. Aggregate user data to get subscriber counts and subscription status
    const channel = await User.aggregate( // [{pipeline1}, {pipeline2}, {pipeline3}]
        [
            {
                $match: { // find
                    username: username?.toLowerCase()
                }
            },
            {
                $lookup: { // joins (left outer join)
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel", // jahan x2 channel me mere channel ka naam hai  
                    as: "subscribedUs"
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber", // jahan x2 subscriber me mere channel ka naam hai
                    as: "subscribedTo"
                }
            },
            {
                $addFields: { // add more fields
                    subscriberCount: {
                        $size: "$subscribedUs"
                    },
                    channelsSubscribedToCount: {
                        $size: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: {$in: [new mongoose.Types.ObjectId(req.user._id), "$subscribedUs.subscriber"]},
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: { // which values to display (1)
                    fullname: 1,
                    username: 1,
                    subscriberCount: 1,
                    channelsSubscribedToCount: 1,
                    isSubscribed: 1,
                    avatar: 1,
                    coverImage: 1,
                    email: 1    
                }
            }
        ]
    )

    if (!channel?.length) {
        throw new ApiError(400, "channel not found")
    }

    // this channel will be returned as an array, channel[0] will have all the details which we require in the form of JSON

    // 4. Return channel profile data
    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

// 1st (user(local collection) --> video(target collection)), then for every video (video(local collection) --> user/owner(target collection))
const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate(
        [ // a lot of videos in the user's watchHistory -> []
            {
                // Step 1 - Match the loggedIn User
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user?._id) // for that user
                }
            },
            {
                // Step 2 - Replace the 'watchHistory' array of video IDs with actual Video documents. (recurrsive -> 1 complete video (owner's profile))
                $lookup: {
                    from: "videos", // from videos collection (in terms of _id)
                    localField: "watchHistory", // Field in User model: watchHistory (array of ObjectId)
                    foreignField: "_id", // Field in Video model: _id
                    as: "watchHistory", // save here as watchHistory - Output field name

                    // Step 3 - We run this sub-pipeline on the *videos* we just found - Inside each video, find the user who uploaded it.
                    pipeline: [
                        {
                            $lookup: { // each video has an owner
                                from: "users", // Target collection: users
                                localField: "owner", // Field in Video model: owner
                                foreignField: "_id", // Field in User model: _id
                                as: "owner", // Output field: owner (initially an array)

                                // Step 4 - Selective display of owner's profile
                                pipeline: [
                                    {
                                        $project: {
                                            fullname: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },

                        // Step 5 - FLATTEN OWNER ARRAY (a common pattern) - 
                        /* $lookup returns an array (e.g., owner: [{name: "Ayran"}]). This converts it to a single object (e.g., owner: {name: "Ayran"}).
                        */
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ]
    )

    return res
    .status(200)
    .json (
        new ApiResponse(200, user[0].watchHistory, "History fetched successfully")
    )
})

export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, currentUser, createNewPassword, updateAccountDetails, updateAvatar, updateCoverImage, getUserChannelProfile, getWatchHistory}