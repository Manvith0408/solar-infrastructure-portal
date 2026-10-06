/**
 * Async Handler Middleware Wrapper
 * Wraps async Express route handlers to automatically forward promise rejections to next(err).
 * Prevents unhandled rejections from crashing the server or stalling HTTP requests.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
