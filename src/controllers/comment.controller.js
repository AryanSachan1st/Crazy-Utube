import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) {
        throw new ApiError(400, "Provide a video id in the URL")
    }
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Bad request - video id is invalid")
    }

    const videoExists = await Video.find({_id: videoId})
    if (!videoExists) {
        throw new ApiError(404, "video with provided id doesn't exists")
    }

    const commentsArray = await Comment.find({
        video: videoId
    }).limit(5)

    return res
    .status(200)
    .json(
        new ApiResponse(200, commentsArray, "Fetched all comments for the video")
    )
})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) {
        throw new ApiError(400, "Provide a video id in the URL")
    }
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Bad request - video id is invalid")
    }
    if (!await Video.find({_id: videoId})) {
        throw new ApiError(400, "Video with provided video id doesn't exists")
    }

    const ownerId = req.user?._id
    if (!ownerId) {
        throw new ApiError(400, "Session failed, login again")
    }

    const { content } = req.body
    if (!content || !content.trim()) {
        throw new ApiError(400, "Comment body is required")
    }

    const comment = await Comment.create({
        video: videoId,
        owner: ownerId,
        content: content
    })

    return res
    .status(201)
    .json(
        new ApiResponse(201, comment, "Comment created and saved successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body
    const userId = req.user?._id

    if (!commentId) {
        throw new ApiError(400, "Provide a comment id in the URL")
    }
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const comment = await Comment.findOne({_id: commentId})
    if (!comment) {
        throw new ApiError(400, "Comment not found")
    }
    if (!comment.owner.equals(userId)) {
        throw new ApiError(400, "Only creators can update their comments")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        {_id: commentId},
        {
            $set: {
                content: content
            }
        },
        {new: true}
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const userId = req.user?._id

    if (!commentId) {
        throw new ApiError(400, "Provide a comment id in the URL")
    }
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }
    const comment = await Comment.findOne({_id: commentId})
    if (!comment) {
        throw new ApiError(400, "Comment not found")
    }
    if (!comment.owner.equals(userId)) {
        throw new ApiError(400, "Only creators can update their comments")
    }

    const deletedComment = await Comment.findByIdAndDelete(
        {_id: commentId}
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200, deletedComment, "Comment deleted successfully")
    )
})

export {getVideoComments, addComment, updateComment, deleteComment}