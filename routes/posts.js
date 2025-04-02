const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const validateId = require('../helpers/validateId'); 
const ApiError = require('../helpers/apiError');


// GET all posts with pagination and optional tag filter
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, tag } = req.query;
    const filter = tag ? { tags: tag } : {};

    // queries in parallel for better performance
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit)),
        
      Post.countDocuments(filter) // Get total  documents
    ]);

    res.json({
      data: posts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total
      }
    });

  } catch (err) {
    next(err);
  }
});

// GET single post by ID
router.get('/:id', validateId, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)  throw new ApiError(404, 'Post not found');
    res.json(post);
  } catch (err) {
    next(err);
  }
});

// POST create a new post ( tricky bugs fixed)
// I used the mongoose in built timestamp, which is more robust.
// Mongoose automatically handles timestamps on all updates (including findOneAndUpdate, which the  original pre('save') hook would miss).
// No need for a pre('save') hook or manual default values.
//That's the best practice
router.post('/', async (req, res, next) => {
  try {
    const { title, content, tags } = req.body;

    if (!title || !content) {
      throw { status: 400, message: 'Title and content are required' };
    }

    const newPost = new Post({
      title,
      content,
      tags
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    next(err);
  }
});

// PUT update post ( tricky bug fixed)
// I Use findByIdAndUpdate
// timestamps: true ensures updatedAt is always updated on findByIdAndUpdate.
// If no actual changes were made (e.g., sending the same title/content), Mongoose skips the save(), so updatedAt doesn’t update.
// but with my solution, the updatedAt will change even if no actual changes were made to the payload
router.put('/:id', validateId, async (req, res, next) => {
  try {
    const updates = req.body;
    
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true } 
    );
    if (!post) throw new ApiError(404, 'Post not found'); 
    res.json(post);

  } catch (err) {
    next(err);
  }
});

// DELETE post (unexpected behavior if ID is malformed (Fixed) Created a validator middleware file in my helper folder)
router.delete('/:id', validateId, async (req, res, next) => {
  try {
    const result = await Post.findByIdAndDelete(req.params.id);
    if (!result)  throw new ApiError(404, 'Post not found'); 
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// search 
router.get('/search/all', async (req, res, next) => {
  try {
    const { q: searchTerm, page = 1, limit = 10 } = req.query;

    // Validating search term
    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    // Convert query parameters to numbers and validate pagination, limit is cap at 50 itmes
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); 

    
    const [results, total] = await Promise.all([
      Post.find(
        { $text: { $search: searchTerm } },
        { score: 0 }
      )
      .sort({ score: { $meta: 'textScore' } })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),

      Post.countDocuments({ $text: { $search: searchTerm } })
    ]);

    res.json({
      data: results,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total
      }
    });

  } catch (err) {
    next(err);
  }
});

// Bulk delete endpoint.    
// I used hard delete because UK  is big on GDPR compliance
// I used the batch method because deleting long dataset takes times and MongoDB may kill long-running operations. Default timeout: 60 seconds
router.delete('/', async (req, res, next) => {
  try {
    const { tag } = req.query;
    const BATCH_SIZE = 1000;

    if (!tag) {
      throw new ApiError(400, 'Tag parameter is required');   
    }

    let totalDeleted = 0;
    let documentsExist = true;

    while (documentsExist) {
      // Find a batch of documents to delete which only fetches the  IDs for efficiency
      const batch = await Post.find({ tags: tag })
        .limit(BATCH_SIZE)
        .select('_id');

      if (batch.length === 0) {
        documentsExist = false;
        continue;
      }

      // Delete the particular  batch by IDs
      const result = await Post.deleteMany({
        _id: { $in: batch.map(doc => doc._id) }
      });

      totalDeleted += result.deletedCount;
    }

    if (totalDeleted === 0) {
      throw new ApiError(400, `No posts found with tag '${tag}'`);
    }

    res.json({
      success: true,
      message: `Deleted ${totalDeleted} posts with tag '${tag}'`
    });

  } catch (err) {
    next(err);
  }
});
module.exports = router;
