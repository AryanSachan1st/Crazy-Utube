import mongoose, { trusted } from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const playlistSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        desc: {
            type: String,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        videos: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Video"
            }
        ],

    },
    {timestamps: true}
)

export const Playlist = mongoose.model("Playlist", playlistSchema)