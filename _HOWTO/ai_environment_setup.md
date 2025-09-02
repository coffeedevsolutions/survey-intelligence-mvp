# AI Implementation Environment Setup

## Required Environment Variables

Add these to your `api/.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# AI Feature Flags
AI_ENABLED=true
AI_DEFAULT_MODEL=gpt-4o-mini
AI_MAX_TOKENS_PER_SESSION=10000
AI_CONFIDENCE_THRESHOLD=0.7

# Cost Controls
AI_DAILY_COST_LIMIT_CENTS=1000  # $10.00 per day
AI_MONTHLY_COST_LIMIT_CENTS=10000  # $100.00 per month
AI_SESSION_COST_LIMIT_CENTS=100  # $1.00 per session

# Advanced Features
AI_ENABLE_ANALYTICS=true
AI_ENABLE_CUSTOM_PROMPTS=true
AI_FALLBACK_TO_STATIC=true
```

## Getting API Keys

### OpenAI API Key
1. Go to https://platform.openai.com/
2. Sign up or log in to your account
3. Navigate to "API Keys" in your dashboard
4. Create a new secret key
5. Copy the key and add it to your `.env` file

**Recommended Models:**
- `gpt-4o-mini`: Cost-effective, good for most survey tasks ($0.15/$0.60 per 1K tokens)
- `gpt-4o`: Premium model for complex question generation ($5/$15 per 1K tokens)



## Cost Estimation

Based on typical survey usage:

### Per Survey Session
- **Basic Questions (5-7 questions)**: $0.01 - $0.05
- **Adaptive Questioning**: $0.05 - $0.15
- **Full AI Customization**: $0.10 - $0.25

### Monthly Estimates (100 sessions)
- **Standard AI**: $5 - $15/month
- **Full AI Features**: $10 - $25/month
- **Heavy Usage (500+ sessions)**: $50 - $125/month

## Installation Steps

1. **Install Dependencies** (already done in your project):
   ```bash
   cd api
   npm install openai  # Already installed
   ```

2. **Run Database Migration**:
   ```bash
   cd api
   node migrations/add_ai_features.js
   ```

3. **Update Server Configuration** (add to `api/config/server.js`):
   ```javascript
   import { aiService } from '../services/aiService.js';
   import enhancedSurveyRoutes from '../routes/enhanced-survey.routes.js';
   
   // Add AI routes
   app.use('/api/ai-survey', enhancedSurveyRoutes);
   ```

4. **Add Frontend AI Tab** (update `web/src/Dashboard.jsx`):
   ```javascript
   import { AISettingsTab } from './components/dashboard/tabs/AISettingsTab.jsx';
   
   // Add to navigation and rendering logic
   case 'ai-settings':
     if (me?.role === 'admin') {
       return <AISettingsTab user={me} />;
     }
     return <div>Access denied</div>;
   ```

## Testing Your AI Integration

1. **Test API Key**:
   ```bash
   curl -X POST https://api.openai.com/v1/chat/completions \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}],"max_tokens":10}'
   ```

2. **Create Test Survey Flow**:
   - Set `use_ai: true` in flow configuration
   - Set `ai_customization_level: 'standard'`
   - Test question generation and fact extraction

3. **Monitor AI Usage**:
   - Check the `ai_session_logs` table for API calls
   - Monitor costs in the AI Settings dashboard
   - Review generated questions for quality

## Security Best Practices

1. **API Key Security**:
   - Never commit API keys to version control
   - Use environment variables only
   - Rotate keys regularly
   - Monitor usage for unauthorized access

2. **Cost Controls**:
   - Set daily/monthly spending limits
   - Monitor token usage per session
   - Implement automatic shutoffs for unusual usage

3. **Data Privacy**:
   - Survey responses are sent to AI providers
   - Ensure compliance with your privacy policy
   - Consider data residency requirements
   - Implement data retention policies

## Troubleshooting

### Common Issues

1. **"Invalid API Key" Error**:
   - Verify key is correct in `.env`
   - Check key has sufficient credits
   - Ensure no extra spaces in key

2. **High Costs**:
   - Reduce `max_tokens` settings
   - Lower `temperature` for more focused responses
   - Switch to cheaper models (`gpt-4o-mini`)

3. **Poor Question Quality**:
   - Adjust prompt templates in AI Settings
   - Increase temperature for more creativity
   - Add domain-specific knowledge

4. **Slow Response Times**:
   - Use faster models (`gpt-4o-mini` vs `gpt-4o`)
   - Reduce max_tokens
   - Implement request timeout handling

### Monitoring Commands

```bash
# Check recent AI usage
psql -c "SELECT ai_action, COUNT(*), AVG(processing_time_ms), SUM(estimated_cost_cents) FROM ai_session_logs WHERE created_at >= NOW() - INTERVAL '24 hours' GROUP BY ai_action;"

# Check error rates
psql -c "SELECT COUNT(*) as total, COUNT(error_message) as errors FROM ai_session_logs WHERE created_at >= NOW() - INTERVAL '24 hours';"

# Check top cost sessions
psql -c "SELECT session_id, SUM(estimated_cost_cents) as total_cost FROM ai_session_logs WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY session_id ORDER BY total_cost DESC LIMIT 10;"
```
