import multer from "multer"
import path from "path";
import { fileURLToPath } from "url";

/*
Error handling in multer-
Multer detects error -> calls next(err) internally -> Global Error Handler.
*/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: function(req, file, cb) { // where the file will be stored
        const uploadPath = path.join(__dirname, "../../public/temp");
        cb(null, uploadPath)
    },
    filename: function(req, file, cb) { // how the file will be named
        cb(null, file.originalname)
    }
})

export const upload = multer({ storage })