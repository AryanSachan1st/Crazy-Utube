export {asyncHandler} // use {} to export it from anywhere inside the same module

// This file is just a wrapper function to execute all types of promise based func()
// Method : using Promise().resolve().reject() (Recommended)
const asyncHandler = (func) => {
    return (req, res, next) => {
        Promise
        .resolve(func(req, res, next))
        .catch((error) => next(error))
    }
}