import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"

const getVideoComments = asyncHandler(async (req, res) => {
    // 1. Get videoId from params
    const { videoId } = req.params
    
    // 2. Check if videoId is provided and valid
    if (!videoId) {
        throw new ApiError(400, "Provide a video id in the URL")
    }
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Bad request - video id is invalid")
    }

    // 3. Check if the video exists in the database
    const videoExists = await Video.find({_id: videoId})
    if (!videoExists) {
        throw new ApiError(404, "video with provided id doesn't exists")
    }

    // 4. Fetch comments for the video (limited to 5)
    const commentsArray = await Comment.find({
        video: videoId
    }).limit(5)

    // 5. Return the comments
    return res
    .status(200)
    .json(
        new ApiResponse(200, commentsArray, "Fetched all comments for the video")
    )
})

const addComment = asyncHandler(async (req, res) => {
    // 1. Get videoId from params
    const { videoId } = req.params

    // 2. Validate videoId
    if (!videoId) {
        throw new ApiError(400, "Provide a video id in the URL")
    }
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Bad request - video id is invalid")
    }

    // 3. Check if the video exists
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // 4. Get the authenticated user's ID
    const ownerId = req.user?._id
    if (!ownerId) {
        throw new ApiError(400, "Session failed, login again")
    }

    // 5. Get comment content from request body
    const { content } = req.body
    if (!content || !content.trim()) {
        throw new ApiError(400, "Comment body is required")
    }

    // 6. Create and save the new comment
    const comment = await Comment.create({
        video: videoId,
        owner: ownerId,
        content: content
    })

    // 7. Return the created comment
    return res
    .status(201)
    .json(
        new ApiResponse(201, comment, "Comment created and saved successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // 1. Get comment_id from params
    const { comment_id } = req.params

    // 2. Validate comment_id
    if (!mongoose.isValidObjectId(comment_id)) {
        throw new ApiError(400, "Invalid comment id")
    }
    
    // 3. Get new content from request body
    const content = req.body?.content
    if (!content) {
        throw new ApiError(400, "Provide some comment content to update")
    }

    // 4. Find the comment
    const comment = await Comment.findById(comment_id)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    // 5. Check if the user is the owner of the comment
    if (!comment.owner.equals(req.user?._id)) {
        throw new ApiError(403, "You can only modify your own comments")
    }

    // 6. Update the comment content
    const updatedComment = await Comment.findByIdAndUpdate(
        comment_id,
        {
            $set: {
                content: content
            }
        },
        {new: true}
    )

    // 7. Return the updated comment
    return res.status(200).json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // 1. Get comment_id from params
    const { comment_id } = req.params

    // 2. Validate comment_id
    if (!mongoose.isValidObjectId(comment_id)) {
        throw new ApiError(400, "Invalid comment id")
    }
    
    // 3. Find the comment
    const comment = await Comment.findById(comment_id)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    // 4. Check if the user is the owner of the comment
    if (!comment.owner.equals(req.user?._id)) {
        throw new ApiError(403, "You can only delete your own comments")
    }

    // 5. Delete the comment
    const deletedComment = await Comment.findByIdAndDelete(comment_id)

    // 6. Return success response
    return res.status(200).json(
        new ApiResponse(200, deletedComment, "Comment deleted successfully")
    )
})

export {getVideoComments, addComment, updateComment, deleteComment}