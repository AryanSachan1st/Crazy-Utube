import mongoose from "mongoose"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Subscription } from "../models/subscription.model.js"
import { User } from "../models/User.model.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    
})
const getChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    if (!channelId) {
        throw new ApiError(400, "Provide a channel id in the URL")
    }
    if (!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id")
    }
    if (!await User.findOne({_id: channelId})) {
        throw new ApiError(404, "Channel with given channel id doesn't exists")
    }
    const subscribers = await Subscription.find(
        {channel: channelId},
        {subscriber: 1, _id: 0}
    ).limit(5)

    return res
    .status(200)
    .json(
        new ApiResponse(200, subscribers, `Fetched all the subscribers for ${channelId}`)
    )
})
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { userId } = req.params
    if (!userId) {
        throw new ApiError(400, "Provide a user id in the URL")
    }
    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }
    if (!await User.findOne({_id: userId})) {
        throw new ApiError(404, "User with given user id doesn't exists")
    }

    const channelsSubscribed = await Subscription.find(
        {subscriber: userId},
        {channel: 1, _id: 0}
    )
    


    return res
    .status(200)
    .json(200, channelsSubscribed, "Fetched all channels subscribed")
})

export { toggleSubscription, getChannelSubscribers, getSubscribedChannels }