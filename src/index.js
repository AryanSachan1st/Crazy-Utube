import connectDB from "./db/index.js"
import dotenv from "dotenv"
import {app} from "./app.js"

dotenv.config({
    path: "./.env"
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