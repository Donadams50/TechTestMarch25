
// Handles ALL errors in your API
const errorHandler = (err, req, res, next) => {
    // Default to 500 if no status code
    const status = err.status || 500; 
    const message = err.message || 'Something went wrong';
  
    res.status(status).json({
      error: {
        status,
        message
      }
    });
  };
  
  module.exports = errorHandler;