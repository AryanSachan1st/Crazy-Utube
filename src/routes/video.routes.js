import {Router} from "express"
import { verifyJWT } from "../middlewares/auth.middleware"
import { upload } from "../middlewares/multer.middleware"
import { getAllVideos, getVideoById, updateVideo, deleteVideo, togglePublishStatus, publishVideo } from "../controllers/video.controller"

const router = Router()
router.use(verifyJWT)

router.route("/").get(getAllVideos).post(
    upload.fields([
        {
            name: "videoFile01",
            maxCount: 1,
        },
        {
            name: "thumbnail",
            maxCount: 1,
        },
    ]),
    publishVideo
)
router.route("/:videoId").get(getVideoById).patch(upload.single("thumbnail"), updateVideo).delete(deleteVideo)
router.route("/toggle/publish/:videoId").patch(togglePublishStatus)

export default router