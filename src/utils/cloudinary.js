/* Difference between Multer and Cloudinary:-
1. Multer handles parsing incoming files (multipart/form-data) on your Node.js server, acting as a temporary file manager, while
2. Cloudinary is a cloud-based media management service that stores, optimizes (resize, compress), transforms, and delivers images/videos globally via a CDN, often working with Multer to send files from server to cloud.
3. Think of Multer as the doorman receiving packages, and Cloudinary as the secure warehouse that organizes, improves, and ships them out. 
*/

import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

// Configuration
cloudinary.config({ // connect to our cloudinary account (with authentication)
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// upload any file using custom wrapper
const uploadOnCloudinary = async (fileLocalPath) => {
        try {
            if (!fileLocalPath) return null;

            const response = await cloudinary.uploader.upload(fileLocalPath, {
                resource_type: "auto"
            })
            console.log("File is uploaded in the cloudinary: ", response.url)
            return response
        } catch (error) {
            fs.unlinkSync(fileLocalPath) // remove the locally stored temp file as the upload operation got failed
            return null
        }
}

export {uploadOnCloudinary}