import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { cookieOptions } from "../constants.js";

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
            $set: {
                refreshToken: undefined
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
    const incommingRT = req.cookie.refreshToken || req.body.refreshToken;
    if (!incommingRT) {
        throw new ApiError(401, "User's refresh token is null or undefined")
    }

    try {
        const decodedToken = jwt.verify(incommingRT, process.env.REFRESH_TOKEN_SECRET); // just to get the original payload
    
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

export {registerUser, loginUser, logoutUser, refreshAccessToken}