import mongoose from "mongoose"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Subscription } from "../models/subscription.model.js"
import { User } from "../models/user.model.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    // 1. Get channel_id from params
    const { channel_id } = req.params

    // 2. Validate channel_id
    if (!mongoose.isValidObjectId(channel_id)) {
        throw new ApiError(400, "Invalid channel_id")
    }

    // 3. Get user_id from authenticated user
    const user_id = req.user?._id

    // 4. Check if subscription already exists
    const subscription = await Subscription.findOne(
        {
            channel: channel_id,
            subscriber: user_id
        }
    )

    // 5. If exists, remove it (unsubscribe)
    if (subscription) {
        await Subscription.findByIdAndDelete(subscription?._id)

        return res.status(200).json(
            new ApiResponse(200, {}, "Unsubscribed Successfully")
        )
    }

    // 6. If not exists, create it (subscribe)
    const new_subscription = await Subscription.create(
        {
            channel: channel_id,
            subscriber: user_id
        }
    )

    // 7. Return success response
    return res.status(201).json(
        new ApiResponse(201, new_subscription, "New Subscription added")
    )
})
const getChannelSubscribers = asyncHandler(async (req, res) => {
    // 1. Get channelId from params
    const { channelId } = req.params

    // 2. Validate channelId
    if (!channelId) {
        throw new ApiError(400, "Provide a channel id in the URL")
    }
    if (!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id")
    }

    // 3. Check if channel exists (User model)
    if (!await User.findOne({_id: channelId})) {
        throw new ApiError(404, "Channel with given channel id doesn't exists")
    }

    // 4. Find subscribers for the channel (array)
    const subscribers = await Subscription.find(
        {channel: channelId},
        {subscriber: 1, _id: 0}
    ).limit(5) // Remove limit if you want all, or keep for pagination

    const totalSubscribers = await Subscription.countDocuments({ channel: channelId })

    // 5. Return subscribers list
    return res
    .status(200)
    .json(
        new ApiResponse(200, { subscribers, totalSubscribers }, `Fetched all the subscribers for ${channelId}`)
    )
})
const getSubscribedChannels = asyncHandler(async (req, res) => {
    // 1. Get userId from params
    const { userId } = req.params
    // 2. Validate userId
    if (!userId) {
        throw new ApiError(400, "Provide a user id in the URL")
    }
    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }
    // 3. Check if user exists
    if (!await User.findOne({_id: userId})) {
        throw new ApiError(404, "User with given user id doesn't exists")
    }

    // 4. Find channels subscribed by the user
    const channelsSubscribed = await Subscription.find(
        {subscriber: userId},
        {channel: 1, _id: 0}
    )
    
    // 5. Return subscribed channels list
    return res
    .status(200)
    .json(
        new ApiResponse(200, channelsSubscribed, "Fetched all channels subscribed")
    )
})

export { toggleSubscription, getChannelSubscribers, getSubscribedChannels }