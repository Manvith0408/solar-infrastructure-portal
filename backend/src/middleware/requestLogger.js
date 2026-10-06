/**
 * Colored Terminal Logging Middleware
 * Formats incoming HTTP requests with colored methods, paths, status codes, and latency.
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Method colors
  const methodColors = {
    GET: '\x1b[32m',     // Green
    POST: '\x1b[34m',    // Blue
    PUT: '\x1b[33m',     // Yellow
    PATCH: '\x1b[35m',   // Magenta
    DELETE: '\x1b[31m',  // Red
    OPTIONS: '\x1b[36m'  // Cyan
  };

  const reset = '\x1b[0m';
  const dim = '\x1b[2m';
  const methodColor = methodColors[req.method] || '\x1b[37m';

  // Hook into response finish event
  res.on('finish', () => {
    const duration = Date.now() - start;
    let statusColor = '\x1b[32m'; // 2xx Green
    if (res.statusCode >= 500) {
      statusColor = '\x1b[31m'; // 5xx Red
    } else if (res.statusCode >= 400) {
      statusColor = '\x1b[33m'; // 4xx Yellow
    } else if (res.statusCode >= 300) {
      statusColor = '\x1b[36m'; // 3xx Cyan
    }

    console.log(
      `${dim}[${timestamp}]${reset} ${methodColor}${req.method.padEnd(7)}${reset} ${req.originalUrl || req.url} ${statusColor}${res.statusCode}${reset} ${dim}${duration}ms${reset}`
    );
  });

  next();
}

module.exports = requestLogger;
