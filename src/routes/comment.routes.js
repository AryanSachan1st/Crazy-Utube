import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {  } from "../controllers/comment.controller.js"

const router = Router()

router.use(verifyJWT)

router.route("/:videoId").get().post()
router.route("/c/:commentID").delete().patch()

export default router