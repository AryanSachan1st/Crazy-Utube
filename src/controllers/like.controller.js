import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler";
import { Video } from "../models/video.model"
import { Tweet } from "../models/tweet.model"
import { Comment } from "../models/comment.model"
import { Like } from "../models/like.model"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user?._id

    if (!videoId) {
        throw new ApiError(400, "Provide the video id in the URL")
    }
    if (mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    const video = await Video.findOne(
        {_id: videoId}
    )
    if (!video) {
        throw new ApiError(400, "Video doesn't exists for this video id")
    }

    const like = await Like.create(
        {
            video: videoId,
            likedBy: userId
        }
    )

    return res
    .status(201)
    .json(
        new ApiResponse(201, like, "Liked the video successfully")
    )
})
const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const userId = req.user?._id

    if (!tweetId) {
        throw new ApiError(400, "Provide the tweet id in the URL")
    }
    if (mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }
    const tweet = await Tweet.findOne(
        {_id: tweetId}
    )
    if (!tweet) {
        throw new ApiError(400, "Tweet doesn't exists for this tweet id")
    }

    const like = await Like.create(
        {
            video: tweetId,
            likedBy: userId
        }
    )

    return res
    .status(201)
    .json(
        new ApiResponse(201, like, "Liked the Tweet successfully")
    )
})
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const userId = req.user?._id

    if (!commentId) {
        throw new ApiError(400, "Provide the comment id in the URL")
    }
    if (mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment id")
    }
    const comment = await Comment.findOne(
        {_id: commentId}
    )
    if (!comment) {
        throw new ApiError(400, "Comment doesn't exists for this comment id")
    }

    const like = await Like.create(
        {
            video: commentId,
            likedBy: userId
        }
    )

    return res
    .status(201)
    .json(
        new ApiResponse(201, like, "Liked the comment successfully")
    )
})
const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    
    const likedVideos = await Like.find(
        {
            likedBy: userId,
            video: {$ne: null}
        },
        {video: 1}
    ).limit(5)

    return res
    .status(200)
    .json(
        new ApiResponse(200, likedVideos, "Fetched liked videos")
    )
})

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos }