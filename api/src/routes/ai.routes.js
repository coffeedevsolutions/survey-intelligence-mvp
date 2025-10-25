import express from 'express';
import OpenAI from 'openai';
import { pool } from '../database/connection.js';

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate template configuration using AI
 */
router.post('/generate-template', async (req, res) => {
  try {
    const { systemPrompt, userPrompt, model = 'gpt-4o-mini', temperature = 0.3, response_format } = req.body;

    if (!systemPrompt || !userPrompt) {
      return res.status(400).json({ error: 'System prompt and user prompt are required' });
    }

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      response_format: response_format || { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    
    res.json({
      content,
      usage: response.usage,
      model: response.model
    });

  } catch (error) {
    console.error('AI template generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate template with AI',
      details: error.message 
    });
  }
});

export default router;
