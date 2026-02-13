/**
 * HOF (Higher Order Function): Wraps an async route handler/middleware.
 * 
 * Why do we need this?
 * - In Express, async functions that throw errors (or return rejected Promises) 
 *   do not automatically trigger the global error handler unless we catch them 
 *   and call `next(error)`.
 * - This utility function automates that process.
 * 
 * How it works:
 * 1. Takes an async function `func` as input.
 * 2. Returns a new function that Express can use as middleware `(req, res, next)`.
 * 3. Inside, it executes `func(req, res, next)`.
 * 4. Wraps the execution in `Promise.resolve()` to handle both synchronous return values and Promises.
 * 5. If `func` throws an error or the Promise rejects, `.catch((error) => next(error))` catches it 
 *    and passes it to Express's global error handling middleware.
 */
const asyncHandler = (func) => {
    return (req, res, next) => {
        Promise
        .resolve(func(req, res, next))
        .catch((error) => next(error)) // Passes the error to the global error handler directly skipping all the middlewares or routes in between
    }
}

export {asyncHandler}