import { Router } from "express"
import { changeCurrentPassword, currentUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateAvatar, updateCoverImage } from "../controllers/user.controller.js"
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

// secured routes (using verifyJWT if required)
router.route("/logout").post(verifyJWT, logoutUser) // verifyjwt to only logout already loggedIn user
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").patch(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, currentUser)
router.route("/update-userDetails").patch(verifyJWT, updateAccountDetails)
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar) // .patch(verify, multer to get the 'user.file', routeController)
router.route("/update-coverImage").patch(verifyJWT, upload.single("coverImage"), updateCoverImage)
router.route("/channel/:username").get(verifyJWT, getUserChannelProfile) // taking the username from params, so '/endpoint/:param-name'
router.route("/watchHistory").get(verifyJWT, getWatchHistory)

export default router