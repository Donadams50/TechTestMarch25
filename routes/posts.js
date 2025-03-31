const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// GET all posts with pagination and optional tag filter
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, tag } = req.query;
    const filter = tag ? { tags: tag } : {};
    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

// GET single post by ID
router.get('/:id', async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    next(err);
  }
});

// POST create a new post (contains tricky bugs)
router.post('/', async (req, res, next) => {
  try {
    const { title, content, tags } = req.body;

    if (!title || !content) {
      throw { status: 400, message: 'Title and content are required' };
    }

    const newPost = new Post({
      title,
      content,
      tags,
      createdAt: new Date()  // Bug: overrides default, but doesn't set updatedAt
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    next(err);
  }
});

// PUT update post (contains tricky bug)
router.put('/:id', async (req, res, next) => {
  try {
    const updates = req.body;

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    Object.assign(post, updates);

    await post.save();  // Bug: updatedAt isn't updated if save is skipped

    res.json(post);
  } catch (err) {
    next(err);
  }
});

// DELETE post (unexpected behavior if ID is malformed)
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await Post.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
