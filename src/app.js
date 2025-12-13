import express from "express"
import cors from "cors"
import cookieParser  from "cookie-parser"

const app = express()

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

export default app