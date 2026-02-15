import mongoose, { mongo } from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const videoSchema = new mongoose.Schema({
    videoFile: {
        type: String, // cloudinary url
        required: true
    },
    thumbnail: {
        type: String, // cloudinary url
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    duration: {
        type: Number, // cloudinary url
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {timestamps: true})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)