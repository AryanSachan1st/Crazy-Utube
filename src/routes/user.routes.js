import { Router } from "express"
import { registerUser } from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js" // insert the middleware in the middle of that route

const router = Router()
router.route("/register").post(
    upload.fields([ // middleware
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]),
    registerUser // route
)

export default router