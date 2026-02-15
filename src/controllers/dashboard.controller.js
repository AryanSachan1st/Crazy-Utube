import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { Tweet } from "../models/tweet.model.js"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

/*
The forEach method expects a synchronous function. When you pass it an async function, that function returns a Promise. forEach doesn't know what to do with those promises—it just ignores them.
Alternatives: for...of () and Promise.all ()
*/

const getChannelStats = asyncHandler(async (req, res) => {
    // 1. Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "User not authenticated");
    }

    // Aggregate stats for videos: total videos, total views, and total likes on videos
    const videoStats = await Video.aggregate([
        {
            $match: { // just like Where clause in SQL
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            // lookup is like nested loops (for each video --> process all like docs)
            $lookup: { // left outer join (video doc (_id) --> likes doc (video))
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes" // this array will store all the 'like' docs for that video
            }
        },
        { // inside of outer loop but outside of inner loop (one video processed completely)
            $project: { // for each video: we only need these values, don't store unnecessary docs
                totalLikes: { $size: "$likes" },
                totalViews: "$views", // just take the value of views and put it in totalViews field
                totalVideos: 1 // one video processed at one time
            }
        },
        { // outside of both loops
            $group: { // the final object which will be displayed
                _id: null,
                totalLikes: { $sum: "$totalLikes" },
                totalViews: { $sum: "$totalViews" },
                totalVideos: { $sum: 1 } // +1 for every video processed
            }
        }
    ]);

    // Aggregate stats for subscribers
    const subscriptionStats = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $count: "totalSubscribers"
        }
    ]);

    // Aggregate stats for tweets: total tweets and total likes on tweets
    const tweetStats = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes"
            }
        },
        {
            $project: {
                totalLikes: { $size: "likes" },
                totalTweets: 1
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: { $sum: "$totalLikes" },
                totalTweets: { $sum: "$totalTweets" },

            }
        }
    ])

    // Aggregate stats for comments: total comments and total likes on comments
    // Note: Assuming we want likes on comments made by the user
    const commentStats = await Comment.aggregate([
        {
            $match: {
                owner: mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $project: {
                totalComments: 1,
                totalLikes: { $size: "likes" }
            }
        },
        {
            $group: {
                _id: null,
                totalComments: { $sum: "$totalComments" },
                totalLikes: { $sum: "$totalLikes" }
            }
        }
    ])

    // Extract values from aggregation results
    const totalVideos = videoStats[0]?.totalVideos || 0;
    const totalVideoLikes = videoStats[0]?.totalLikes || 0;
    const totalViews = videoStats[0]?.totalViews || 0;

    const totalSubscribers = subscriptionStats[0]?.totalSubscribers || 0;

    const totalTweets = tweetStats[0]?.totalTweets || 0;
    const totalTweetLikes = tweetStats[0]?.totalLikes || 0;

    const totalComments = commentStats[0]?.totalComments || 0;
    const totalCommentLikes = commentStats[0]?.totalLikes || 0;

    const totalLikes = totalVideoLikes + totalTweetLikes + totalCommentLikes;

    // Return the consolidated stats
    return res.status(200).json(
        new ApiResponse(200, {
            totalVideos,
            totalViews,
            totalSubscribers,
            totalLikes,
            totalTweets,
            totalComments,
            detailedLikes: {
                videos: totalVideoLikes,
                tweets: totalTweetLikes,
                comments: totalCommentLikes
            }
        }, "Channel stats fetched successfully")
    );
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // 1. Get channelId from user object
    // Note: req.user._id represents the currently logged-in user's ID
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "User not authenticated");
    }

    // 2. Find all videos uploaded by this channel/user
    // Sort by createdAt descending (newest first) by default
    const videos = await Video.find({ owner: userId })
        .sort({ createdAt: -1 })
        .select("-description -isPublished"); // Exclude certain fields to keep response light if needed

    // 3. Return the videos list
    return res
        .status(200)
        .json(
            new ApiResponse(200, videos, "Fetched all videos for the channel")
        );
})

export { getChannelStats, getChannelVideos }