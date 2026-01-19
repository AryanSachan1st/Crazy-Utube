import { asyncHandler } from "../utils/asyncHandler.js"

const healthcheck = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json("API is healthy and running")
})

export { healthcheck }