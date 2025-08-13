const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { upload, cloudinary } = require('../config/cloudinary');
const authMiddleware = require('../middleware/auth');

// --- Public Routes ---

// Get all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// --- Protected Routes ---

// Create new post - Requires authentication
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const { uid, name, email } = req.user; // User info from auth middleware

    const postData = {
      title,
      content,
      author: name || email, // Use display name or email as author
      userId: uid, // Link post to the user
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    };

    if (req.file) {
      postData.imageUrl = req.file.path;
      postData.imagePublicId = req.file.filename;
    }

    const post = new Post(postData);
    const savedPost = await post.save();
    
    res.status(201).json(savedPost);
  } catch (error) {
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    res.status(400).json({ message: error.message });
  }
});

// Update post - Requires authentication and authorization
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { title, content, author, tags } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Authorization check: Ensure the user owns the post
    if (post.userId !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden: You are not authorized to edit this post' });
    }

    post.title = title || post.title;
    post.content = content || post.content;
    // Author is not updated, it's tied to the original creator
    post.tags = tags ? tags.split(',').map(tag => tag.trim()) : post.tags;

    if (req.file) {
      if (post.imagePublicId) {
        await cloudinary.uploader.destroy(post.imagePublicId);
      }
      post.imageUrl = req.file.path;
      post.imagePublicId = req.file.filename;
    }

    const updatedPost = await post.save();
    res.json(updatedPost);
  } catch (error) {
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    res.status(400).json({ message: error.message });
  }
});

// Delete post - Requires authentication and authorization
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Authorization check: Ensure the user owns the post
    if (post.userId !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden: You are not authorized to delete this post' });
    }

    if (post.imagePublicId) {
      await cloudinary.uploader.destroy(post.imagePublicId);
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
