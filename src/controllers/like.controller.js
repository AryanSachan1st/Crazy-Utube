import mongoose, { isValidObjectId, mongo } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    // 1. Get videoId from params
    const { videoId } = req.params

    // 2. Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoID")
    }

    // 3. Check if the user already liked the video
    const likedAlready = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id,
    })

    // 4. If liked, unlike it (delete document)
    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id)

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Unliked successfully"))
    }

    // 5. If not liked, like it (create document)
    await Like.create({
        video: videoId,
        likedBy: req.user?._id,
    })

    // 6. Return success response
    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "Liked successfully"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    // 1. Get commentId from params
    const { commentId } = req.params

    // 2. Validate commentId
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commentID")
    }

    // 3. Check if the user already liked the comment
    const likedAlready = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id,
    })

    // 4. If liked, unlike it
    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id)

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Unliked successfully"))
    }

    // 5. If not liked, like it
    await Like.create({
        comment: commentId,
        likedBy: req.user?._id,
    })

    // 6. Return success response
    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "Liked successfully"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    // 1. Get user id and tweet id
    const user_id = req.user?._id
    const { tweet_id } = req.params

    // 2. Validate tweet_id
    if (!mongoose.isValidObjectId(tweet_id)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    // 3. Check if user already liked the tweet
    const likedAlready_tweet = await Like.findOne(
        {
            tweet: tweet_id,
            likedBy: user_id
        }
    )

    // 4. If liked, unlike it
    if (likedAlready_tweet) {
        const tweet = await Like.findByIdAndDelete(likedAlready_tweet?._id)

        return res.status(200).json(
            new ApiResponse(200, {}, "Tweet Like removed successfully")
        )
    }

    // 5. If not liked, like it
    const tweet_like = await Like.create(
        {
            tweet: tweet_id,
            likedBy: user_id
        }
    )

    // 6. Return success response
    return res.status(201).json(
        new ApiResponse(201, tweet_like, "Tweet Liked successfully")
    )
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            $match: {
                // 1. Filter likes by the current user's ID
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
                // 2. Ensure we only get likes associated with videos (not comments or tweets)
                //    'video' field must exist and not be null
                video: { $exists: true, $ne: null }
            }
        },
        {
            $lookup: {
                // 3. Join with the 'videos' collection to get video details
                from: "videos",
                localField: "video",      // Field in 'Like' schema
                foreignField: "_id",      // Field in 'Video' schema
                as: "likedVideo",         // Result will be an array of video documents
                pipeline: [
                    {
                        $lookup: {
                            // 4. Nested lookup to get the owner (user) details for each video
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        // 5. Select only specific fields for the owner
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            // 6. 'owner' from lookup is an array (e.g., [{...}]), take the first element
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                // 7. 'likedVideo' from lookup is an array, take the first element to make it an object
                likedVideo: {
                    $first: "$likedVideo"
                }
            }
        },
        {
            $match: {
                // 8. Filter out any documents where 'likedVideo' does not exist
                //    This handles cases where the video might have been deleted but the like remains
                likedVideo: { $exists: true }
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideos,
                "Liked videos fetched successfully"
            )
        )

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}