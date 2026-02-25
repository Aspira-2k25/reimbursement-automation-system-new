/**
 * Pagination utilities for MongoDB queries
 */

/**
 * Parse pagination parameters from request query
 * @param {Object} query - Express req.query object
 * @param {Object} options - Configuration options
 * @returns {Object} Parsed pagination parameters
 */
const parsePaginationParams = (query, options = {}) => {
  const {
    defaultPage = 1,
    defaultLimit = 20,
    maxLimit = 100
  } = options;

  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  // Validate and clamp values
  page = isNaN(page) || page < 1 ? defaultPage : page;
  limit = isNaN(limit) || limit < 1 ? defaultLimit : Math.min(limit, maxLimit);

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Create pagination metadata for response
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total item count
 * @returns {Object} Pagination metadata
 */
const createPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

/**
 * Execute paginated MongoDB query
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} options - Query options (sort, select, etc.)
 * @param {Object} pagination - Pagination params from parsePaginationParams
 * @returns {Object} { data, pagination }
 */
const paginateQuery = async (model, filter, options, pagination) => {
  const { page, limit, skip } = pagination;
  
  // Execute query and count in parallel
  const [data, total] = await Promise.all([
    model
      .find(filter)
      .sort(options.sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(options.select || '')
      .lean(), // Use lean for better performance on read-only queries
    model.countDocuments(filter)
  ]);

  return {
    data,
    pagination: createPaginationMeta(page, limit, total)
  };
};

/**
 * Middleware to add pagination helpers to request
 */
const paginationMiddleware = (defaultOptions = {}) => {
  return (req, res, next) => {
    req.pagination = parsePaginationParams(req.query, defaultOptions);
    next();
  };
};

module.exports = {
  parsePaginationParams,
  createPaginationMeta,
  paginateQuery,
  paginationMiddleware
};
