import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res, next) => {
    // get the user details from req.body
    const {username, fullname, email, password} = req.body;

    // perform validation - not empty
    if (
        [username, fullname, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "This field is required")
    }

    // check if user already exists through any unique field (email/username)
    const userExist = User.findOne({
        $or: [{username}, {email}]
    })
    if (userExist) {
        throw new ApiError(409, "Username or Email already exist, try unique")
    }

    // check for image upload, avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    console.log(req.files);
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required")
    }

    // upload image to cloudinary
    const avatarStatus = await uploadOnCloudinary(avatarLocalPath);
    const coverImageStatus = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required")
    }

    // create user object in db
    const user = await User.create({
        fullname, 
        avatar: avatarStatus.url,
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

export {registerUser}