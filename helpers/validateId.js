const mongoose = require('mongoose');
const ApiError = require('../helpers/apiError');

const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid ID format'); 
  }
  next();
};

module.exports = validateId;