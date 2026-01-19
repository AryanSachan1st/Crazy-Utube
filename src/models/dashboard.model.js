import mongoose from "mongoose"

const dashboardSchema = mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    videos: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    playlists: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Playlist"
        }
    ],
    subscribers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subscription"
        }
    ],
    subscribedTo: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subscription"
        }
    ],
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Like"
        }
    ]
})

export const Dashboard = mongoose.model("Dashboard", dashboardSchema)