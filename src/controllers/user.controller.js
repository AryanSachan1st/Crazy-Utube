import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
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
        avatar: avatarStatus?.url || "",
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
    const incommingRT = req.cookies.refreshToken || req.body.refreshToken;
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
    
        if (incommingRT !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const {accessToken, refreshToken} = await generateTokens(user?._id); // attach new access token to the user
    
        return res
        .status(200)
        .cookie("accessToken", cookieOptions)
        .cookie("refreshToken", cookieOptions)
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

const createNewPassword = asyncHandler(async (req, res) => { // NOT-COMPLETED: loggedOut user forgets their pass & want to create new
    // Note: OTP verification is must required to verify that the user is entering only their username/email
    const {username, email, newPassword} = req.body;
    if (!username && !email) {
        throw new ApiError(400, "Provide atleast one of username or email");
    }
    const user = await User.findOne(
        {
            $or: [{username}, {email}]   
        }
    )
    if (!user) {
        throw new ApiError(400, "User with this username or email doesn't exist");
    }
    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Password changed successfully")
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullname, email} = req.body
    if (!fullname && !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname, email
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateAvatar = asyncHandler(async (req, res) => {
    console.log(req.file);
    if (!req.file?.path) {
        throw new ApiError(400, "Please upload new Avatar")
    }
    const {newAvatarPath} = req.file?.path;

    const avatarCloudinaryStatus = await uploadOnCloudinary(newAvatarPath, req.file.fieldname);
    console.log(avatarCloudinaryStatus)
    if (!avatarCloudinaryStatus.url) {
        throw new ApiError(500, "Cloudinary upload for avatar failed")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatarCloudinaryStatus.url // needs the pulbic img url (cloudinary)
            }
        },
        {new: true}
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar changed successfully")
    )
})

const updateCoverImage = asyncHandler(async (req, res) => {
    const {newCoverPath} = req.files?.path;
    if (!newCoverPath) {
        throw new ApiError(400, "Please upload new Cover Image")
    }

    const coverCloudinaryStatus = await uploadOnCloudinary(newCoverPath);
    if (!coverCloudinaryStatus.url) {
        throw new ApiError(500, "Cloudinary upload for cover failed")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverCloudinaryStatus.url // needs the pulbic img url (cloudinary)
            }
        },
        {new: true}
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover Image changed successfully")
    )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params;
    if (!username) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate( // [{pipeline1}, {pipeline2}, {pipeline3}]
        [
            {
                $match: {
                    username: username?.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                $addFields: {
                    subscriberCount: {
                        $size: "$subscribers"
                    },
                    channelsSubscribedToCount: {
                        $size: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: {$in: [new mongoose.Types.ObjectId(req.user._id), "$subscribers.subscriber"]},
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: { // which values to pass
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

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate(
        [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user?._id)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
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
                        { // directly giving owner JSON from newly overwritten owner[]
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