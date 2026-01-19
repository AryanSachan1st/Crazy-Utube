import express from "express"
import cors from "cors"
import cookieParser  from "cookie-parser"

const app = express();
export {app}

// middlewares
app.use(cors({ // cors
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json({ // allow json req
    limit: "16kb"
}))
app.use(express.urlencoded({ // allow url req
    extended: true, limit: "16kb"
}))
app.use(express.static("public")) // use public folder for static files
app.use(cookieParser()) // cookies


// router import
import userRouter from "./routes/user.routes.js" // we are giving manchaaha name 'userRouter' becz 'user.routes.js' is exporting 'default' router
app.use("/api/v1/users", userRouter) // route is used like middleware >> app.use()
// http://localhost:8000/api/v1/users/register

import tweetRouter from "./routes/tweet.routes.js"
app.use("/api/v1/tweets", tweetRouter)

import commentRouter from "./routes/comment.routes.js"
app.use("/api/v1/comments", commentRouter)

import likeRouter from "./routes/like.routes.js"
app.use("/api/v1/likes", likeRouter)

import videoRouter from "./routes/video.routes.js"
app.use("/api/v1/videos", videoRouter)

import playlistRouter from "./routes/playlist.routes.js"
app.use("/api/v1/playlist", playlistRouter)

import healthCheckRouter from "./routes/healthcheck.routes.js"
app.use("/api/v1/healthCheck",healthCheckRouter )