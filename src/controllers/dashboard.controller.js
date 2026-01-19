import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const { channelId } = req.user?._id
    const channelStats = await 
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const { channelId } = req.user?._id
    const videos = await Video.find(
        {owner: channelId}
    ).select("-description -isPublished")

    return res
    .status(200)
    .json(200, videos, "Fetched all the videos for this channel")
})

export { getChannelStats, getChannelVideos }