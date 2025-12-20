import mongoose from "mongoose"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler"
import { Tweet } from "../models/tweet.model"

const createTweet = asyncHandler(async (req, res) => {
    const ownerId = req.user?._id; // after verifyJWT, .user is attached to user
    if (!ownerId) {
        throw new ApiError(401, "Owner doesn't exists - unauthorized request")
    }

    const { content } = req.body;
    if (!content || !content.trim()) {
        throw new ApiError(400, "Tweet content is required")
    }

    const tweet = await Tweet.create (
        {
            owner: ownerId,
            content: content.trim()
        }
    )

    return res
    .status(201)
    .json(
        new ApiResponse(201, tweet, "Tweet created and saved successfully")
    )

})

const getUserTweets = asyncHandler(async (req, res) => {
    const { ownerId } = req.params;
    if (!ownerId) { // not provided
        throw new ApiError(400, "Provide user id in the URL to fetch the tweets")
    }
    if (!mongoose.isValidObjectId(ownerId)) { // provided but incorrect
        throw new ApiError(400, "Bad request")
    }

    const tweetsArray = await Tweet.find(
        {owner: ownerId}
    ).limit(5)

    return res
    .status(200)
    .json(
        new ApiResponse(200, tweetsArray, "Tweets fetched successfully")
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    if (!tweetId) {
        throw new ApiError(400, "Provide tweetID in URL")
    }
    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Bad request - invalid tweet id")
    }

    const { updated_content } = req.body
    if (!updated_content || !updated_content.trim()) {
        throw new ApiError(400, "Provide some content")
    }

    const tweetCheck = await Tweet.findById(tweetId);
    if (tweetCheck == null) {
        throw new ApiError(400, "Tweet not found")
    }
    if (!req.user?._id.equals(tweetCheck.owner)) {
        throw new ApiError(400, "Only creators can update that tweet")
    }

    const tweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: updated_content
            }
        },
        {
            new: true
        }
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200, tweet, "Tweet updated successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    if (!tweetId) {
        throw new ApiError(400, "Provide tweetID in URL")
    }
    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Bad request - invalid tweet id")
    }

    const tweetCheck = await Tweet.findById(tweetId);
    if (tweetCheck == null) {
        throw new ApiError(400, "tweet not found")
    }
    if (!req.user?._id.equals(tweetCheck.owner)) {
        throw new ApiError(400, "Only creators can update that tweet")
    }

    const tweet = await Tweet.findByIdAndDelete(
        tweetId,
        {
            $unset: {
                content: 1
            }
        },
        {
            new: true
        }
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200, tweet, "Tweet deleted successfully")
    )
})

export {createTweet, getUserTweets, updateTweet, deleteTweet}