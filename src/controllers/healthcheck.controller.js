import { asyncHandler } from "../utils/asyncHandler.js"

const healthcheck = asyncHandler(async (req, res) => {
    // 1. Return a success response to indicate the system is healthy
    return res
    .status(200)
    .json("API is healthy and running")
})

export { healthcheck }