const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
  title: {
    type: String,
    required: true,
    minlength: 5
  },
  content: {
    type: String,
    required: true
  },
  tags: {
    type: [String],
    default: [],
    index: true 
  },
  
},

{
  timestamps: true,
}
);
// text index for search ( index on title + content) this gives room for optimizing the search query and makes it low latency
postSchema.index({ 
  title: 'text', 
  content: 'text' 
}, { 
  weights: {
    title: 3,   
    content: 1 
  },
  name: 'post_text_search' 
});



module.exports = mongoose.model('Post', postSchema);
