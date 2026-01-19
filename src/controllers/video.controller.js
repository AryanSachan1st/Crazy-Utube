import mongoose from "mongoose"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { Video } from "../models/video.model.js"
import { User } from "../models/User.model.js"

const getAllVideos = asyncHandler(async (req, res) => { // important
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    if (!userId) {
        throw new ApiError(400, "Provide a userId in the query parameters")
    }
    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId")
    }

    if (!await User.findById(userId)) {
        throw new ApiError(404, "Channel with this user id not found")
    }
    const filter = {
        owner: userId,
        ...(query && { title: { $regex: query, $options: "i" } })
    }
    const videos = await Video.find(filter)
        .sort({ [sortBy]: sortType === "asc" ? 1: -1 })
        .skip((Number(page)-1) * Number(limit))
        .limit(Number(limit))

    return res
    .status(200)
    .json(
        new ApiResponse(200, videos, "Fetched the videos")
    )
})
const publishVideo = asyncHandler(async (req, res) => {
    const videoFile = req.files?.videoFile[0]
    if (!videoFile) {
        throw new ApiError(400, "video file is required")
    }

    let thumbnail = null
    if (req.files?.thumbnail?.length) {
        thumbnail = req.files.thumbnail[0]
    }
    const { title, description } = req.body
    if (!title || !description) {
        throw new ApiError(400, "title and description are required")
    }

    const ownerId = req.user?._id

    const cloudinaryVideoUpload = await uploadOnCloudinary(videoFile.path, videoFile.fieldname)
    const cloudinaryThumbnailUpload = thumbnail && await uploadOnCloudinary(thumbnail.path, thumbnail.fieldname)

    const video = await Video.create({
        title, description,
        videoFile: cloudinaryVideoUpload.url || "",
        thumbnail: cloudinaryThumbnailUpload.url || "",
        owner: ownerId,
        duration: cloudinaryVideoUpload.duration || 0
    })

    return res
    .status(200)
    .json(
        new ApiResponse(200, video, "Video uploaded successfully")
    )
})
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) {
        throw new ApiError(400, "Provide a video id in the URL")
    }
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findOne(
        {_id: videoId}
    ).select("-isPublished")

    if (!video) {
        throw new ApiError(400, "Video doesn't exists")
    }

    return res
    .status(200)
    .json(200, video, "Video fetched successfully")
})
const updateVideo = asyncHandler(async (req, res) => { // handled req.params, req.body, req.user, req.files
    const { videoId } = req.params
    if (!videoId) {
        throw new ApiError(400, "Provide video id int the URL")
    }

    const loggedInUserId = req.user?._id
    const { title, description } = req.body
    if (!title || !description) {
        throw new ApiError(400, "Title and Description both are necessary")
    }

    let thumbnail = req.file || null

    const cloudinaryThumbnailUpload = thumbnail && await uploadOnCloudinary(thumbnail.path, thumbnail.fieldname)

    const updatedVideo = await Video.findOneAndUpdate(
        {_id: videoId, owner: loggedInUserId},
        {
            $set: {
                title, description,
                thumbnail: cloudinaryThumbnailUpload?.url || ""
            }
        },
        {new: true}
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedVideo, "Video file updated successfully")
    )
})
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const loggedInUserId = req.user?._id

    if (!videoId) {
        throw new ApiError(400, "Video ID is required");
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findOneAndDelete(
        {_id: videoId, owner: loggedInUserId},
    )
    if (!video) {
        throw new ApiError(400, "Video not found or not authorized")
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, video, "Video deleted")
    )
})
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) {
        throw new ApiError(400, "Provide a video id in the URL")
    }
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const statusUpdatedVideo = await Video.findByIdAndUpdate(
        {_id: videoId},
        {
            $set: {
                isPublished: !isPublished
            }
        },
        {new: true}
    )
    if (!statusUpdatedVideo) {
        throw new ApiError(400, "Video doesn't exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, statusUpdatedVideo, "Toggle status Updated")
    )
})

export { getAllVideos, publishVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus }