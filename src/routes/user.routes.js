import { Router } from "express"
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js" // insert the middleware in the middle of that route
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()
router.route("/register").post(
    upload.fields([ // middleware
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]),
    registerUser // route
)
router.route("/login").post(loginUser) // no middleware required

// secured routes
router.route("/logout").post(verifyJWT, logoutUser) // verifyjwt to only logout already loggedIn user
router.route("/refresh-token").post(refreshAccessToken)

export default router