/**
 * OpenAI Provider
 * 
 * Wrapper for OpenAI API with standardized interface
 */

import { OpenAI } from 'openai';
import { getConfig } from '../../config/index.js';

export class OpenAIProvider {
  constructor() {
    this.client = new OpenAI({
      apiKey: getConfig('OPENAI_API_KEY')
    });
    
    this.models = {
      'gpt-4o': { inputCost: 0.00500, outputCost: 0.01500 },
      'gpt-4o-mini': { inputCost: 0.00015, outputCost: 0.00060 },
      'gpt-3.5-turbo': { inputCost: 0.00050, outputCost: 0.00150 }
    };
  }

  /**
   * Generate chat completion
   */
  async generateCompletion(messages, options = {}) {
    const {
      model = getConfig('AI_DEFAULT_MODEL') || 'gpt-4o-mini',
      temperature = 0.2,
      maxTokens = 4000,
      ...otherOptions
    } = options;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        ...otherOptions
      });

      return {
        content: response.choices[0]?.message?.content || '',
        usage: response.usage,
        model: response.model,
        finishReason: response.choices[0]?.finish_reason
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  /**
   * Estimate cost for completion
   */
  estimateCost(model, inputTokens, outputTokens) {
    const modelPricing = this.models[model] || this.models['gpt-4o-mini'];
    const inputCost = (inputTokens / 1000) * modelPricing.inputCost;
    const outputCost = (outputTokens / 1000) * modelPricing.outputCost;
    return inputCost + outputCost;
  }

  /**
   * Check if model is available
   */
  isModelAvailable(model) {
    return model in this.models;
  }

  /**
   * Get available models
   */
  getAvailableModels() {
    return Object.keys(this.models);
  }
}

export const openaiProvider = new OpenAIProvider();
export default openaiProvider;
