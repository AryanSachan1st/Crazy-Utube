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
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false})
        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Tokens generation failed inside user.controller.js")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get the user details from req.body
    const {username, fullname, email, password} = req.body;
    // avatar and coverImage will be taken from 'req.files()'

    // perform validation - not empty
    if (
        [username, fullname, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "Fill all required fields")
    }

    // check if user already exists through any unique field (email/username)
    const userExist = await User.findOne({
        $or: [{username}, {email}]
    })
    if (userExist) {
        throw new ApiError(409, "Username or Email already exist, try unique")
    }

    // check for image upload, avatar
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

    // upload image to cloudinary
    const avatarStatus = await uploadOnCloudinary(avatarLocalPath, req.files?.avatar[0].fieldname);
    const coverImageStatus = await uploadOnCloudinary(coverImageLocalPath, coverName);

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required")
    }

    // create user object in db
    const user = await User.create({
        fullname, 
        avatar: avatarStatus?.url,
        coverImage: coverImageStatus?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })    

    // remove password and refreshToken from response (if userExist --> remove the pass, refreshToken)
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for user creation success
    if (!createdUser) {
        throw new ApiError(500, "Server failed to register the user, please try again")
    }

    // send response with user details
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    );
})

const loginUser = asyncHandler(async (req, res) => {
    // get email/username and password from req.body
    const {username, email, password} = req.body;

    // validate required fields
    if (!username && !email) {
        throw new ApiError(400, "Enter username or password")
    }
    
    // find user in database
    const user = await User.findOne({ // this user do not have the tokens
        $or: [{username}, {email}]
    })

    // if user does not exist -> return error
    if (!user) {
        throw new ApiError(404, "User doesn't exists, register new user!")
    }

    // Note: 'User' (model) can only access mongodb functions like .findOne(), etc. To access user-defined functions like .isPasswordCorrect() -> use the 'user'

    // compare hashed password
    const passMatched = await user.isPasswordCorrect(password)
    if (!passMatched) {
        throw new ApiError(401, "Invalid password, try again");
    }

    // generate access and refresh tokens
    const { accessToken, refreshToken } = await generateTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // set tokens in httpOnly cookies
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
    // return user data (without password)
})

const logoutUser = asyncHandler(async (req, res) => { // just remove tokens and cookies
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
    return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json (
        new ApiResponse(200, {}, "User logged out successfully")
    )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incommingRT = req.cookies.refreshToken || req.header("Authorization")?.replace("Bearer ", "");
    if (!incommingRT) {
        throw new ApiError(401, "User's refresh token is null or undefined")
    }

    try {
        const decodedToken = jwt.verify(incommingRT, process.env.REFRESH_TOKEN_SECRET); // just to get the original payload
        if (!decodedToken) {
            throw new ApiError(400, "refresh token does not matched with the stored RT of this user")
        }
    
        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }
    
        // -----------------------------------------------------------------------
        // REFRESH TOKEN SECURITY CHECK:
        // This check ensures that the incoming token matches the one currently stored 
        // in the database for this user. This is critical for:
        // 
        // 1. Preventing Token Reuse (Replay Attacks):
        //    - When a token is refreshed/used, a NEW token is saved to the DB.
        //    - If a hacker tries to use the OLD (already used) token, it won't match
        //      the new one in the DB, and the request is rejected.
        // 
        // 2. Handling Multiple Logins (Single Session Policy):
        //    - If User logs in on Device A, DB has Token A.
        //    - If User logs in on Device B, DB is overwritten with Token B.
        //    - Device A's Token A is now invalid because it doesn't match Token B.
        //    - Result: Only the most recent device stays logged in.
        // -----------------------------------------------------------------------
        if (incommingRT !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const {accessToken, refreshToken} = await generateTokens(user?._id); // attach new access token to the user
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json (
            new ApiResponse(
                200, { accessToken, refreshToken }, "Access Token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => { // loggedIn user want's to change their pass
    const {oldPass, newPass} = req.body;
    const user = await User.findById(req.user?._id)
    if (!user) {
        throw new ApiError(401, "User not found")
    }
    if (!await user.isPasswordCorrect(oldPass)) {
        throw new ApiError(400, "Enter correct old password")
    }
    user.password = newPass;
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))

})

const currentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(200, req.user, "current user fetched successfully")
    )
})

const createNewPassword = asyncHandler(async (req, res) => { // otp verification of the requested username is pending to authenticate whether the actual user is trying to change the password
    const {userName, email, new_password} = req.body;

    if (!userName && !email) {
        throw new ApiError(400, "Enter atleast one of the username or email")
    }

    const user = await User.find(
        { $or: [{ userName }, { email }] }
    )

    if (!user) {
        throw new ApiError(400, "User doesn't exists")
    }

    user.password = new_password // mongoDB's 'pre' hook will handle the encryption
    
    const display_user = await User.findById(user._id).select("-refreshToken -password")

    res.status(201).json(
        new ApiResponse(201, display_user, "Password changed successfully")
    )

})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {username, fullname, email} = req.body
    if (!fullname && !email) {
        throw new ApiError(400, "All fields are required")
    }

    if (!req.file?.avatar[0]?.path) {
        throw new ApiError(400, "Please upload new Avatar")
    }

    const avatar_local_path = req.files?.avatar[0]?.path
    const avatar_name = req.files?.avatar[0]?.fieldname

    const coverImage_local_path = req.files?.coverImage[0]?.path
    const coverImage_name = req.files?.coverImage[0]?.fieldname

    const cloudinary_avatar_response = await uploadOnCloudinary(avatar_local_path, avatar_name)
    let cloudinary_coverImage_response = ""
    if (coverImage_local_path) {
        cloudinary_coverImage_response = await uploadOnCloudinary(coverImage_local_path, coverImage_name)
    }

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

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params;
    if (!username) {
        throw new ApiError(400, "username is missing")
    }

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