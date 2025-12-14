import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}`) // await -> db takes time
        console.log(`\n MongoDB connected !! DB Host: ${connectionInstance.connection.host}`); // output -->
        // MongoDB connected !! DB Host: cluster0-shard-00-01.bqhbcgf.mongodb.net
        console.log(connectionInstance.connection.name);

    } catch (error) {
        console.error("Error: ", error);
        process.exit(1)
    }
}

export default connectDB