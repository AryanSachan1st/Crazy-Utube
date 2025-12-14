import connectDB from "./db/index.js"
import dotenv from "dotenv"
import {app} from "./app.js"

dotenv.config({
    path: "./env"
})

connectDB()
.then(() => {
    const server = app.listen(process.env.PORT || 8000, () => {
        console.log(`Server started listening on: http://localhost:${process.env.PORT}`);
    })
    server.on("error", (error) => { // if mongodb connects but server crashes
        console.error(`Server error >> ${error}`);
    })
})
.catch((error) => {
    console.error("MongoDB connection failed >> ", error);
    process.exit(1);
})



/*
import express from "express";
const app = express()
;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error) => { // db connected but aur server can't talk to db
            console.error("Error: ", error);
            throw error
        })
        app.listen(process.env.PORT, () => {
            console.log(`Server is listening on: http://localhost:${process.env.PORT}`);
        })
    } catch (error) { // db not connected
        console.error("Error: ", error)
        throw error
    }
})()
*/