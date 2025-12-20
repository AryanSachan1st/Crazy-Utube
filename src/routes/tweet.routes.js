import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware"
import { createTweet, deleteTweet, updateTweet, getUserTweets } from "../controllers/tweet.controller";

const router = Router();

// adding the middleware for every route
router.use(verifyJWT);

// routes
router.route("/").post(createTweet);
router.route("/user/:user_id").get(getUserTweets);
router.route("/:tweet_id").patch(updateTweet).delete(deleteTweet); // the route depends on type of req (patch, delete)

export default router;
