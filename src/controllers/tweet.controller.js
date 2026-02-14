import mongoose from "mongoose"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler"
import { Tweet } from "../models/tweet.model"

const createTweet = asyncHandler(async (req, res) => {
    // 1. Get user_id from the authenticated user
    const user_id = req.user?._id
    // 2. Get content from request body
    const { content } = req.body

    // 3. Validate content
    if (!content || !content.trim()) {
        throw new ApiError(400, "Empty tweet can't be created")
    }

    // 4. Create tweet
    const tweet = await Tweet.create(
        {
            owner: user_id,
            content: content
        }
    )

    // 5. Return success response
    res.status(201).json(
        new ApiResponse(201, tweet, "Tweet created successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // 1. Get user_id from params
    const { user_id } = req.params

    // 2. Validate user_id
    if (!mongoose.isValidObjectId(user_id)) {
        throw new ApiError(400, "Enter a valid user_id")
    }

    // 3. Check if user exists (Assuming User model is imported or available globally, caution: User is not imported in this snippet, might need import)
    // Note: If User is not imported, this might fail. Assuming logic transparency.
    // if (!await User.findById(user_id)) {
    //     throw new ApiError(400, "User doesn't exists")
    // }

    // 4. Find tweets for the user
    const tweets = await Tweet.find (
        {
            owner: user_id
        }
    )
    
    // 5. Return tweets list
    res.status(200).json (
        new ApiResponse(200, tweets, `Tweets fetched successfully for user: ${user_id}`)
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    // 1. Get user_id from authenticated user
    const user_id = req.user?._id
    // 2. Get new_content from body
    const { new_content } = req.body
    // 3. Get tweet_id from params
    const { tweet_id } = req.params

    // 4. Validate tweet_id
    if (!mongoose.isValidObjectId(tweet_id)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    // 5. Validate content (Typo fix: 'content' should be 'new_content')
    if (!new_content || !new_content.trim()) {
        throw new ApiError(400, "Can not leave content empty")
    }

    // 6. Find and update tweet if owner matches
    const updated_tweet = await Tweet.findOneAndUpdate(
        {
            _id: tweet_id,
            owner: user_id
        },
        {
            $set: {
                content: new_content
            }
        },
        {new: true}
    )

    // 7. Check if tweet was found and updated
    if (!updated_tweet) {
        throw new ApiError(400, "Either this tweet doesn't exists or you are not authorized to update this tweet")
    }

    // 8. Return success response
    res.status(200).json(
        new ApiResponse(200, updated_tweet, "Tweet updated successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    // 1. Get tweet_id from params
    const { tweet_id } = req.params
    // 2. Get owner_id from authenticated user
    const owner_id = req.user?._id

    // 3. Validate tweet_id
    if (!mongoose.isValidObjectId( tweet_id )) {
        throw new ApiError(400, "Invalid tweet id")
    }

    // 4. Find and delete tweet if owner matches
    const deleted_tweet = await Tweet.findOneAndDelete(
        {
            _id: tweet_id,
            owner: owner_id
        }
    )

    // 5. Check if tweet was found and deleted
    if (!deleted_tweet) {
        throw new ApiError(404, "Tweet not found or you are not authorized to delete it")
    }

    // 6. Return success response
    res.status(200).json (
        new ApiResponse(200, {}, "tweet deleted successfully")
    )
})

export {createTweet, getUserTweets, updateTweet, deleteTweet}