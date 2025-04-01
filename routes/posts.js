const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const validateId = require('../helpers/validateId'); 

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
    if (!post) return res.status(404).json({ error: 'Post not found' });
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
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);

  } catch (err) {
    next(err);
  }
});

// DELETE post (unexpected behavior if ID is malformed (Fixed) Created a validator middleware file in my helper folder)
router.delete('/:id', validateId, async (req, res, next) => {
  try {
    const result = await Post.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Post not found' });
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

    // Convert query parameters to numbers and validate pagination, limit should not be more than 50
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Cap at 50 items

    
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

// routes/posts.js
router.delete('/', async (req, res, next) => {
  try {
    const { tag } = req.query;

    // Validation
    if (!tag) {
      return res.status(400).json({ 
        error: 'Tag parameter is required (e.g., /posts?tag=js)' 
      });
    }

    // Batch deletion (1000 docs per batch) to make it optimized
    const BATCH_SIZE = 1000;
    let totalDeleted = 0;
    let shouldContinue = true;

    while (shouldContinue) {
      const result = await Post.deleteMany({ 
        tags: tag 
      }).limit(BATCH_SIZE);

      totalDeleted += result.deletedCount;
      shouldContinue = result.deletedCount === BATCH_SIZE;

    }

    // Handle no documents found edge case
    if (totalDeleted === 0) {
      return res.status(404).json({ 
        message: `No posts found with tag '${tag}'` 
      });
    }

    res.json({
      success: true,
      message: `Deleted ${totalDeleted} posts with tag '${tag}'`,
      deletedCount: totalDeleted
    });

  } catch (err) {
    next(err);
  }
});
module.exports = router;
