import { Router } from "express"
import { healthcheck } from "../controllers/healthcheck.controller"

const router = Router()

router.route("/", healthcheck)

export default router