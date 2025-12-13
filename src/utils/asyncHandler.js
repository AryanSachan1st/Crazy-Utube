export {asyncHandler} // use {} to export it from anywhere inside the same module

// This file is just a wrapper function to execute all types of promise based func()

/* 
// Method 1 : using try-catch
const asyncHandler = (func) => async (error, req, res, next) => {
    try {
        await func(error, req, res, next); 
    } catch (error) {
        res.status(error.code || 500).json({
            success: false,
            message: error.message
        })
    }
}
*/

// Method 2 : using Promise().resolve().reject()
const asyncHandler = (func) => {
    (error, req, res, next) => {
        Promise
        .resolve(func(error, req, res, next))
        .catch((error) => next(error))
    }
}