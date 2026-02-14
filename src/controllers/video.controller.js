import mongoose, { mongo } from "mongoose"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"

const getAllVideos = asyncHandler(async (req, res) => { // important
    // 1. Get query params (page, limit, query, etc.)
    // req.query retrieves parameters from the URL query string (e.g., ?page=1&limit=10)
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    
    // 2. Validate userId
    if (!userId) {
        throw new ApiError(400, "Provide a userId in the query parameters")
    }
    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId")
    }

    if (!await User.findById(userId)) {
        throw new ApiError(404, "Channel with this user id not found")
    }

    // 3. Build filter object
    // Initialize filter with owner (userId). 
    // If 'query' exists, add a regex search for 'title' (case-insensitive) to the filter object
    const filter = {
        owner: userId,
        ...(query && { title: { $regex: query, $options: "i" } })
    }

    // 4. Query videos with pagination and sorting
    const videos = await Video.find(filter)
        // Sort using computed property name [sortBy]. Logic: sortType === "asc" ? 1 (ascending) : -1 (descending)
        .sort({ [sortBy]: sortType === "asc" ? 1: -1 }) 
        // Skip logic for pagination: calculate how many documents to skip based on current page
        .skip((Number(page)-1) * Number(limit))
        // Limit the number of documents returned per page
        .limit(Number(limit))

    // 5. Return videos
    return res
    .status(200)
    .json(
        new ApiResponse(200, videos, "Fetched the videos")
    )
})
const publishVideo = asyncHandler(async (req, res) => {
    const { title, desc } = req.body
    const user_id = req.user?._id

    const video_file = req.files?.videoFile[0]
    const thumbnail_file = req.files?.thumbnail[0]

    if (!title) {
        throw new ApiError(400, "Enter a title for your video")
    }

    if (!video_file) {
        throw new ApiError(400, "Please upload a video file")
    }

    const cloudinary_video_file = await uploadOnCloudinary(video_file?.path, video_file?.fieldname)
    const cloudinary_thumbnail_file = await uploadOnCloudinary(thumbnail_file?.path, thumbnail_file?.fieldname)

    if (!cloudinary_video_file || !cloudinary_video_file?.url) {
        throw new ApiError(500, "Can't upload video on cloud")
    }

    const video = await Video.create(
        {
            title: title,
            description: desc || "",
            owner: user_id,
            videoFile: cloudinary_video_file?.url,
            thumbnail: cloudinary_thumbnail_file?.url || "",
            duration: cloudinary_video_file?.duration
        }
    )

    /*
    While checking if (!video) is good practice for query operations (like findOne where "not found" is a valid result that isn't an error), it is redundant for create.

    If create fails, the code stops at that line and jumps to the error handler.
    If create succeeds, video is guaranteed to be an object.
    */
    return res.status(201).json(
        new ApiResponse(200, video, "Video published successfully")
    )
})
const getVideoById = asyncHandler(async (req, res) => {
    const { video_id } = req.params
    
    if (!mongoose.isValidObjectId( video_id )) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(video_id)
    
    if (!video) {
        throw new ApiError(404, "Video doesn't exists")
    }

    return res.status(200).json(
        new ApiResponse(200, video, "Video fetched sucessfully")
    )

})
const updateVideo = asyncHandler(async (req, res) => {
    const { user_id } = req.user?._id
    const { title, desc } = req.body
    const { video_id } = req.params
    
    if (!title) {
        throw new ApiError(400, "Title can't be empty")
    }
    const thumbnail_file = req.file?.thumbnail[0]

    if (!thumbnail_file) {
        throw new ApiError(400, "Upload a thumbnail")
    }

    const cloudinary_thumbnail_file = uploadOnCloudinary(thumbnail_file?.path, thumbnail_file?.fieldname)

    if (!cloudinary_thumbnail_file || !cloudinary_thumbnail_file?.url) {
        throw new ApiError(500, "Can't upload thumbnail to cloud")
    }

    const updated_video = await Video.findOneAndUpdate(
        {
            _id: video_id,
            owner: user_id
        },
        {
            $set: {
                title, desc,
                thumbnail: cloudinary_thumbnail_file?.url
            }
        },
        {new: true}
    )

    if (!updated_video) {
        throw new ApiError(400, "Either video doesn't exists or you are not authorized to edit this video")
    }

    return res.status(200).json(
        new ApiResponse(200, updated_video, "Video updated successfully")
    )
})
const deleteVideo = asyncHandler(async (req, res) => {
    const { video_id } = req.params
    const user_id = req.user?._id

    if (!mongoose.isValidObjectId(video_id)) {
        throw new ApiError(400, "Invalid video id")
    }

    const deleted_video = await Video.findOneAndDelete(
        {
            _id: video_id,
            owner: user_id
        }
    )

    if (!deleted_video) {
        throw new ApiError(400, "Either video doesn't exists or you are not authorized to delete this video")
    }

    return res.status(200).json(
        new ApiResponse(200, deleted_video, `Video with id: ${video_id} deleted successfully`)
    )
})
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { video_id } = req.params
    const user_id = req.user?._id

    if (!mongoose.isValidObjectId( video_id )) {
        throw new ApiError(400, "Invalid video id")
    }

    const toggled_video = await Video.findOneAndUpdate(
        {
            _id: video_id,
            owner: user_id
        },
        {
            $set: {
                isPublished: !isPublished
            }
        },
        {new: true}
    )

    if (!togglePublishStatus) {
        throw new ApiError(400, "Either video doesn't exists or you are not authorized to update this video")
    }

    return res.status(200).json(
        new ApiResponse(200, {
            video_id: togglePublishStatus._id,
            isPublished: togglePublishStatus.isPublished
        }, "Published status changed successfully")
    )
})

export { getAllVideos, publishVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus }