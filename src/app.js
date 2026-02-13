import express from "express"
import cors from "cors"
import cookieParser  from "cookie-parser"

/*
What we usually write in app.js file-
1. create the app through express.
2. write all the middlewares.
3. write all the routes.

Note: Do not listen the app here, listen the app in index.js file after establishing connection to mongoDB.
*/

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


// Global Error Handler
// This middleware will catch errors thrown by previous middlewares or routes
/*
Summary of the Error Flow-
1. Controller/Middleware: Throws new ApiError(404, "User not found").
2. AsyncHandler: Catches this error and calls next(error).
3. Express: Detecting an error, it skips to the Global Error Handler in 
app.js.
4. Global Handler: Formats the error and sends a clean JSON response to the client.
*/
app.use((err, req, res, next) => {
    // Determine the status code
    const statusCode = err.statusCode || 500;
    
    // Determine the error message
    const message = err.message || "Internal Server Error";
    
    // Determine any additional error details
    const errors = err.errors || [];

    // Send the JSON response
    res.status(statusCode).json({
        success: false,
        message,
        errors,
        // stack: err.stack // Uncomment to see stack trace in response
    });
});