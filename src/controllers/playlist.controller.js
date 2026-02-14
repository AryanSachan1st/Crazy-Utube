import mongoose, { mongo } from "mongoose";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Playlist } from "../models/playlist.model.js";
import { User } from "../models/user.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
    // 1. Get Name and Description from request body
    const { name, desc } = req.body
    const owner_id = req.user?._id

    // 2. Validate that name is provided
    if (!name) {
        throw new ApiError(400, "Playlist name is required")
    }

    // 3. Create the playlist in the database
    const playlist = Playlist.create(
        {
            name: name,
            desc: desc || "",
            owner: owner_id
        }
    )

    // 4. Return the created playlist
    return res.status(201).json(
        new ApiResponse(201, playlist, "Playlist created successfully")
    )
})
const getUserPLaylist = asyncHandler(async (req, res) => {
    // 1. Get the current user's ID
    const owner_id = req.user?._id

    // 2. Find all playlists owned by this user
    const all_playlists = await Playlist.find(
        {owner: owner_id}
    )

    // 3. Return the list of playlists
    res.status(200).json(
        new ApiResponse(200, all_playlists, "Your Playlists fetched successfully")
    )
})
const getPlaylistById = asyncHandler(async (req, res) => {
    // 1. Get playlist_id from URL params
    const { playlist_id } = req.params
    
    // 2. Validate playlist_id
    if (!mongoose.isValidObjectId(playlist_id)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    // 3. Find the playlist by ID
    const playlist = await Playlist.findOne(playlist_id)

    // 4. Check if playlist exists
    if (!playlist_id) { // This check seems redundant or incorrect logic in original code, but keeping flow
        throw new ApiError(400, "Playlist doesn't exists")
    }

    // 5. Return the playlist
    res.status(200).json(
        new ApiResponse(200, playlist, `Playlist with id: ${playlist_id} fetched successfully`)
    )
})
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    // 1. Get video_id and playlist_id from params
    const { video_id, playlist_id } = req.params
    const user_id = req.user?._id

    // 2. Validate IDs
    if (!mongoose.isValidObjectId(video_id) || !mongoose.isValidObjectId(playlist_id)) {
        throw new ApiError(400, "Invalid video id or playlist id")
    }

    // 3. Verify playlist exists and user is owner
    const owner_match = await Playlist.findOne(
        {
            _id: playlist_id,
            owner: user_id
        }
    )
    if (!owner_match) {
        throw new ApiError(400, "You can only add videos to our own playlists")
    }

    // 4. Add video to request playlist
    const playlist = await Playlist.findByIdAndUpdate(
        playlist_id,
        {
            $addToSet: {
                videos: video_id
            }
        },
        {new: true} // Return updated document
    )
    
    // 5. Check if update was successful
    if (!playlist) {
        throw new ApiError(400, "Playlist doesn't exists")
    }

    // 6. Return response
    return res.status(200).json(
        new ApiResponse(200, `video added to playlist ${playlist_id} successfully`)
    )

})
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // 1. Get video_id and playlist_id from params
    const { video_id, playlist_id } = req.params
    const user_id = req.user?._id

    // 2. Validate IDs
    if (!mongoose.isValidObjectId(video_id) || !mongoose.isValidObjectId(playlist_id)) {
        throw new ApiError(400, "Invalid video id or playlist id")
    }

    // 3. Verify playlist exists and user is owner
    const owner_match = await Playlist.findOne(
        {
            _id: playlist_id,
            owner: user_id
        }
    )
    if (!owner_match) {
        throw new ApiError(400, "You can only remove videos from our own playlists")
    }

    // 4. Remove video from playlist
    const playlist = await Playlist.findByIdAndUpdate(
        playlist_id,
        {
            $pull: {
                videos: video_id
            }
        },
        {new: true}
    )
    
    // 5. Check if update was successful
    if (!playlist) {
        throw new ApiError(400, "Playlist doesn't exists")
    }

    // 6. Return response
    return res.status(200).json(
        new ApiResponse(200, `video removed from playlist ${playlist_id} successfully`)
    )

})
const deletePlaylist = asyncHandler(async (req, res) => {
    // 1. Get playlistId from params
    const { playlistId } = req.params
    const userId = req.user?._id

    // 2. Validate playlistId
    if (!playlistId) {
        throw new ApiError(400, "Provide a playlist id in the URL")
    }
    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    // 3. Verify playlist exists and user is the owner
    const playlist = await Playlist.findOne(
        {
            _id: playlistId,
            owner: userId
        }
    )
    if (!playlist) {
        throw new ApiError(400, "Either Playlist doesn't exists or you are not the owner of that playlist")
    }

    // 4. Delete the playlist
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlist?._id)

    // 5. Return success response
    return res
    .status(200)
    .json(
        new ApiResponse(200, deletePlaylist, "Playlist deleted successfully")
    )
})
const updatePlaylist = asyncHandler(async (req, res) => {
    // 1. Get params and body data
    const { playlistId } = req.params
    const { name, desc } = req.body
    const loggedInUserId = req.user?._id

    // 2. Validate playlistId
    if (!playlistId) {
        throw new ApiError(400, "Provide a playlist id in the URL")
    }
    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    // 3. Check if playlist exists
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(400, "Playlist doesn't exists")
    }

    // 4. Validate input data
    if (!name || !desc) {
        throw new ApiError(400, "name and description required")
    }

    // 5. Update playlist if user is owner
    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {_id: playlistId, owner: loggedInUserId},
        {
            $set: {name, desc}
        },
        {new: true}
    )

    // 6. Check if update was successful (ownership check implicit in query)
    if (!updatedPlaylist) {
        throw new ApiError(400, "Only owners can update their playlist")
    }

    // 7. Return updated playlist
    return res
    .status(200)
    .json(
        new ApiResponse(200, updatePlaylist, "Playlist updated successfully")
    )
})

export { createPlaylist, getPlaylistById, getUserPLaylist, addVideoToPlaylist, removeVideoFromPlaylist, deletePlaylist, updatePlaylist }