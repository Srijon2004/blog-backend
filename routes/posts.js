const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { upload, cloudinary } = require('../config/cloudinary');

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

// Create new post
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, content, author, tags } = req.body;
    
    const postData = {
      title,
      content,
      author,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    };

    // If image was uploaded, add image URL and public ID
    if (req.file) {
      postData.imageUrl = req.file.path;
      postData.imagePublicId = req.file.filename;
    }

    const post = new Post(postData);
    const savedPost = await post.save();
    
    res.status(201).json(savedPost);
  } catch (error) {
    // If there was an error and an image was uploaded, delete it from Cloudinary
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    res.status(400).json({ message: error.message });
  }
});

// Update post
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { title, content, author, tags } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Update basic fields
    post.title = title || post.title;
    post.content = content || post.content;
    post.author = author || post.author;
    post.tags = tags ? tags.split(',').map(tag => tag.trim()) : post.tags;

    // Handle image update
    if (req.file) {
      // Delete old image if exists
      if (post.imagePublicId) {
        await cloudinary.uploader.destroy(post.imagePublicId);
      }
      
      // Update with new image
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

// Delete post
router.delete('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Delete image from Cloudinary if exists
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