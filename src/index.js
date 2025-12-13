import connectDB from "./db/index.js"
import dotenv from "dotenv"

dotenv.config({
    path: "./env"
})

connectDB();



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