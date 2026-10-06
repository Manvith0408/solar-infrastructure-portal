const NodeCache = require('node-cache');

/**
 * Shared in-memory cache instance for aggregating CRM leads and stats.
 * Default TTL: 60 seconds (1 minute), cleanup check every 120 seconds.
 */
const statsCache = new NodeCache({ stdTTL: 60, checkperiod: 120, useClones: false });

/**
 * Invalidates the cached lead statistics when new leads or status changes occur.
 */
function invalidateLeadStatsCache() {
  statsCache.del('lead_stats_agg');
}

module.exports = {
  statsCache,
  invalidateLeadStatsCache
};
