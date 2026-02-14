import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getVideoComments, addComment, updateComment, deleteComment } from "../controllers/comment.controller.js"

const router = Router()

router.use(verifyJWT) // use it before every routing

router.route("/:videoId").get(getVideoComments).post(addComment)
router.route("/c/:commentID").delete(deleteComment).patch(updateComment)

export default router