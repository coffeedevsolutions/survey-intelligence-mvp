/**
 * Favorites Routes
 * Handles analytics page favorites functionality
 */

import express from 'express';
import { pool } from '../../../database/connection.js';

const router = express.Router();

// Get user's favorites
router.get('/analytics/favorites', async (req, res) => {
  try {
    const { userId, orgId } = req.query;
    
    if (!userId || !orgId) {
      return res.status(400).json({ error: 'User ID and Organization ID are required' });
    }

    const query = `
      SELECT 
        id,
        page_name,
        page_title,
        page_description,
        page_icon,
        page_category,
        created_at
      FROM analytics_favorites
      WHERE user_id = $1 AND org_id = $2
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId, orgId]);
    
    res.json({
      success: true,
      favorites: result.rows
    });

  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch favorites',
      message: error.message 
    });
  }
});

// Add a favorite
router.post('/analytics/favorites', async (req, res) => {
  try {
    const { 
      userId, 
      orgId, 
      pageName, 
      pageTitle, 
      pageDescription, 
      pageIcon, 
      pageCategory 
    } = req.body;
    
    if (!userId || !orgId || !pageName || !pageTitle) {
      return res.status(400).json({ 
        success: false,
        error: 'User ID, Organization ID, page name, and page title are required' 
      });
    }

    const query = `
      INSERT INTO analytics_favorites 
      (user_id, org_id, page_name, page_title, page_description, page_icon, page_category)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, org_id, page_name) 
      DO UPDATE SET 
        page_title = EXCLUDED.page_title,
        page_description = EXCLUDED.page_description,
        page_icon = EXCLUDED.page_icon,
        page_category = EXCLUDED.page_category,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [
      userId, 
      orgId, 
      pageName, 
      pageTitle, 
      pageDescription || null, 
      pageIcon || null, 
      pageCategory || null
    ]);
    
    res.json({
      success: true,
      favorite: result.rows[0],
      message: 'Favorite added successfully'
    });

  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add favorite',
      message: error.message 
    });
  }
});

// Remove a favorite
router.delete('/analytics/favorites/:pageName', async (req, res) => {
  try {
    const { pageName } = req.params;
    const { userId, orgId } = req.query;
    
    if (!userId || !orgId || !pageName) {
      return res.status(400).json({ 
        success: false,
        error: 'User ID, Organization ID, and page name are required' 
      });
    }

    const query = `
      DELETE FROM analytics_favorites 
      WHERE user_id = $1 AND org_id = $2 AND page_name = $3
      RETURNING *
    `;

    const result = await pool.query(query, [userId, orgId, pageName]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Favorite not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Favorite removed successfully'
    });

  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove favorite',
      message: error.message 
    });
  }
});

// Check if a page is favorited
router.get('/analytics/favorites/check/:pageName', async (req, res) => {
  try {
    const { pageName } = req.params;
    const { userId, orgId } = req.query;
    
    if (!userId || !orgId || !pageName) {
      return res.status(400).json({ 
        success: false,
        error: 'User ID, Organization ID, and page name are required' 
      });
    }

    const query = `
      SELECT EXISTS(
        SELECT 1 FROM analytics_favorites 
        WHERE user_id = $1 AND org_id = $2 AND page_name = $3
      ) as is_favorited
    `;

    const result = await pool.query(query, [userId, orgId, pageName]);
    
    res.json({
      success: true,
      isFavorited: result.rows[0].is_favorited
    });

  } catch (error) {
    console.error('Error checking favorite status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check favorite status',
      message: error.message 
    });
  }
});

export default router;
