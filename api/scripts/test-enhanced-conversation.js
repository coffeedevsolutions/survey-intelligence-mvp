#!/usr/bin/env node

/**
 * Test script for the Enhanced Conversation Tracking System
 * This script validates that the new AI context understanding works correctly
 */

import { pool } from '../src/database/connection.js';
import { enhancedUnifiedTemplateService } from '../src/platform/templates/services/enhancedUnifiedTemplateService.js';
import conversationTracker from '../src/core/surveys/services/conversationTrackingService.js';
import { unifiedTemplateService } from '../src/platform/templates/services/unifiedTemplateService.js';

const TEST_SESSION_ID = 'test_enhanced_conversation_' + Date.now();

async function runConversationTest() {
  console.log('🚀 Testing Enhanced Conversation Tracking System\n');
  
  try {
    // 1. Create a test session first
    console.log('1. Creating test session...');
    await pool.query(`
      INSERT INTO sessions (id, current_question_id, completed, org_id)
      VALUES ($1, 'intro', false, 1)
      ON CONFLICT (id) DO NOTHING
    `, [TEST_SESSION_ID]);
    console.log('✅ Test session created\n');
    
    // 2. Initialize conversation tracking
    console.log('2. Initializing conversation tracking...');
    await conversationTracker.initializeConversationTracking(TEST_SESSION_ID);
    console.log('✅ Conversation tracking initialized\n');
    
    // 3. Get a template for testing
    console.log('3. Getting unified template...');
    const template = await unifiedTemplateService.getDefaultTemplate(1); // Assuming org_id 1 exists
    if (!template) {
      console.log('⚠️ No template found, creating mock template');
      // Mock template for testing
      template = {
        template_type: 'ai_dynamic',
        name: 'Test Template',
        ai_config: {
          survey_goal: 'Test conversation tracking',
          optimization_config: {
            max_turns: 5,
            coverage_requirement: 0.8
          }
        }
      };
    }
    console.log(`✅ Using template: ${template.name}\n`);
    
    // 4. Test question generation and similarity detection
    console.log('4. Testing question generation...');
    const firstQuestion = await enhancedUnifiedTemplateService.generateAIQuestion(
      template, 
      [], 
      TEST_SESSION_ID
    );
    
    if (firstQuestion) {
      console.log(`✅ Generated first question: ${firstQuestion.question_text}`);
    } else {
      console.log('⚠️ No first question generated (OpenAI may not be available)');
      return;
    }
    
    // 5. Simulate a conversation
    console.log('\n5. Simulating conversation...');
    const mockAnswers = [
      "We need a better system to manage our contractor prequalification process. Currently using OneNote and shared folders which is inefficient.",
      "The main pain points are that it takes too long to find documents, team members can't collaborate effectively, and we lose track of requirements.",
      "Success would be measured by reducing qualification time from 3 weeks to 1 week, and being able to process 50% more contractors per month.",
      "Key stakeholders include the prequalification team (5 people), project managers who need the data, and contractors who submit documents.",
      "We need document management, workflow automation, compliance tracking, and integration with our existing project management system."
    ];
    
    for (let i = 0; i < mockAnswers.length; i++) {
      const questionId = firstQuestion.question_id || `test_q${i + 1}`;
      const answer = mockAnswers[i];
      
      console.log(`\nTurn ${i + 1}:`);
      console.log(`Q: ${firstQuestion.question_text}`);
      console.log(`A: ${answer}`);
      
      // Process the answer
      const analysisResult = await enhancedUnifiedTemplateService.processAnswer(
        TEST_SESSION_ID,
        questionId,
        answer,
        firstQuestion.question_text
      );
      
      console.log(`💡 Extracted ${analysisResult.extractedInsights.length} insights`);
      
      // Check if we should continue
      const conversationHistory = await enhancedUnifiedTemplateService.buildConversationHistory(TEST_SESSION_ID);
      const shouldContinue = await enhancedUnifiedTemplateService.shouldContinueAsking(
        template,
        conversationHistory.map(h => ({ ...h, sessionId: TEST_SESSION_ID })),
        answer
      );
      
      console.log(`📊 Should continue: ${shouldContinue.continue} (${(shouldContinue.completeness * 100).toFixed(1)}% complete)`);
      
      if (shouldContinue.continue && i < mockAnswers.length - 1) {
        // Generate next question
        const nextQuestion = await enhancedUnifiedTemplateService.generateAIQuestion(
          template,
          conversationHistory,
          TEST_SESSION_ID
        );
        
        if (nextQuestion) {
          console.log(`🔮 Next question: ${nextQuestion.question_text}`);
          firstQuestion.question_text = nextQuestion.question_text;
          firstQuestion.question_id = nextQuestion.question_id || `test_q${i + 2}`;
        } else {
          console.log('🛑 No more questions needed');
          break;
        }
      }
    }
    
    // 6. Test conversation analytics
    console.log('\n6. Testing conversation analytics...');
    const analytics = await enhancedUnifiedTemplateService.getConversationAnalytics(TEST_SESSION_ID);
    
    console.log(`📈 Analytics Summary:`);
    console.log(`   - Total turns: ${analytics.totalTurns}`);
    console.log(`   - Total insights: ${analytics.totalInsights}`);
    console.log(`   - Completion: ${(analytics.conversationState.completion_percentage * 100).toFixed(1)}%`);
    console.log(`   - Topics covered: ${analytics.conversationState.topics_covered?.join(', ') || 'none'}`);
    console.log(`   - Insights by type:`);
    
    Object.entries(analytics.insightsByType).forEach(([type, insights]) => {
      console.log(`     ${type}: ${insights.length} (${insights.map(i => i.value).join(', ')})`);
    });
    
    // 7. Test brief generation
    console.log('\n7. Testing enhanced brief generation...');
    const brief = await enhancedUnifiedTemplateService.generateBrief(
      template,
      [],
      TEST_SESSION_ID
    );
    
    console.log('✅ Generated enhanced brief:');
    console.log('---');
    console.log(brief.substring(0, 500) + '...');
    console.log('---\n');
    
    // 8. Test similarity detection
    console.log('8. Testing similarity detection...');
    const similarityTest = await conversationTracker.checkQuestionSimilarity(
      TEST_SESSION_ID,
      "What are the main challenges with your current contractor management process?", // Similar to first answer topic
      0.7
    );
    
    console.log(`🔍 Similarity check: ${similarityTest.isSimilar ? 'SIMILAR' : 'UNIQUE'} (${similarityTest.maxSimilarity.toFixed(3)})`);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    try {
      // Clean up conversation tracking data
      await pool.query('DELETE FROM conversation_history WHERE session_id = $1', [TEST_SESSION_ID]);
      await pool.query('DELETE FROM question_embeddings WHERE session_id = $1', [TEST_SESSION_ID]);
      await pool.query('DELETE FROM ai_conversation_insights WHERE session_id = $1', [TEST_SESSION_ID]);
      await pool.query('DELETE FROM conversation_state WHERE session_id = $1', [TEST_SESSION_ID]);
      
      // Clean up session
      await pool.query('DELETE FROM sessions WHERE id = $1', [TEST_SESSION_ID]);
      
      console.log('✅ Cleanup completed');
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup warning:', cleanupError.message);
    }
  }
}

async function runQuickValidation() {
  console.log('🔍 Quick validation of database tables...\n');
  
  const tables = [
    'conversation_history',
    'question_embeddings', 
    'ai_conversation_insights',
    'conversation_state'
  ];
  
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`✅ Table ${table}: ${result.rows[0].count} records`);
    } catch (error) {
      console.log(`❌ Table ${table}: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--validate-only')) {
    await runQuickValidation();
  } else {
    await runConversationTest();
  }
  
  await pool.end();
}

main().catch(console.error);
