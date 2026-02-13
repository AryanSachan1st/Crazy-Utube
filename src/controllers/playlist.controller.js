import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Playlist } from "../models/playlist.model.js";
import { User } from "../models/user.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, desc } = req.body
    if (!name || !desc) {
        throw new ApiError(400, "Name and description of playlist are required")
    }

    const ownerId = req.user?._id

    const playlist = await Playlist.create({
        name, desc,
        owner: ownerId
    })

    return res
    .status(201)
    .json(
        new ApiResponse(201, playlist, "Playlist created successfully")
    )
})
const getUserPLaylist = asyncHandler(async (req, res) => {
    const { userId } = req.params
    if (!userId) {
        throw new ApiError(400, "Provide a user id int the URL")
    }
    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }
    if (!await User.findById(userId)) {
        throw new ApiError(400, "Bad request - user doesn't exists")
    }

    const playlistArray = []
    playlistArray = await Playlist.find(
        {owner: userId}
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlistArray, "Playlist fetched successfully")
    )
})
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    if (!playlistId) {
        throw new ApiError(400, "Provide a playlist id in the URL")
    }
    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(400, "Playlist doesn't exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "Playlist with given playlist id fetched successfully")
    )
})
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { videoId, playlistId } = req.params
    const loggedInUserId = req.user?._id

    if (!playlistId || !videoId) {
        throw new ApiError(400, "Provide a playlist id and a video id in the URL")
    }
    if (!mongoose.isValidObjectId(playlistId) || !mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist id or videoId")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(400, "Playlist doesn't exists")
    }
    

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        {_id: playlistId, owner: loggedInUserId},
        {
            $addToSet: { // prevents duplicate additions
                videos: videoId
            }
        },
        {new : true}
    )
    if (!updatedPlaylist) {
        throw new ApiError(400, "Only creators can add new video to their playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatePlaylist, "Video added to playlist successfully")
    )
})
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { videoId, playlistId } = req.params
    const loggedInUserId = req.user?._id

    if (!playlistId || !videoId) {
        throw new ApiError(400, "Provide a playlist id and a video id in the URL")
    }
    if (!mongoose.isValidObjectId(playlistId) || !mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist id or videoId")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(400, "Playlist doesn't exists")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        {_id: playlistId, owner: loggedInUserId},
        {
            $pull: { // pulls out the particular value from the array
                videos: videoId
            }
        },
        {new : true}
    )
    if (!updatedPlaylist) {
        throw new ApiError(400, "Only creators can remove aa video from their playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatePlaylist, "Video removed from playlist successfully")
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const loggedInUserId = req.user?._id

    if (!playlistId) {
        throw new ApiError(400, "Provide a playlist id in the URL")
    }
    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(400, "Playlist doesn't exists")
    }

    const deletedPlaylist = await Playlist.findOneAndDelete(
        {_id: playlistId, owner: loggedInUserId},
    )
    if (!deletedPlaylist) {
        throw new ApiError(400, "Only owners can delete their playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, deletePlaylist, "Playlist deleted successfully")
    )
})
const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, desc } = req.body
    const loggedInUserId = req.user?._id

    if (!playlistId) {
        throw new ApiError(400, "Provide a playlist id in the URL")
    }
    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(400, "Playlist doesn't exists")
    }

    if (!name || !desc) {
        throw new ApiError(400, "name and description required")
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {_id: playlistId, owner: loggedInUserId},
        {
            $set: {name, desc}
        },
        {new: true}
    )

    if (!updatedPlaylist) {
        throw new ApiError(400, "Only owners can update their playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatePlaylist, "Playlist updated successfully")
    )
})

export { createPlaylist, getPlaylistById, getUserPLaylist, addVideoToPlaylist, removeVideoFromPlaylist, deletePlaylist, updatePlaylist }