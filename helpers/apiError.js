// Custom error class for consistent errors
class ApiError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
  
  module.exports = ApiError;