export {asyncHandler}

const asyncHandler = (func) => {
    return (req, res, next) => {
        Promise
        .resolve(func(req, res, next))
        .catch((error) => next(error))
    }
}