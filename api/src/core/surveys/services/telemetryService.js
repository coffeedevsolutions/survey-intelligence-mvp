/**
 * Telemetry Service
 * Logs per-turn metrics for survey optimization and analytics
 */

import { pool } from '../../database/connection.js';

/**
 * Log turn metrics for survey analytics
 */
export async function logTurnMetrics(sessionId, turnData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Insert turn telemetry record
    await client.query(`
      INSERT INTO survey_turn_telemetry (
        session_id,
        turn_number,
        model_used,
        tokens_in,
        tokens_out,
        latency_ms,
        eig_score,
        slot_coverage_percent,
        fatigue_score,
        similarity_match,
        stop_reason,
        question_intent,
        question_confidence,
        template_id,
        generation_attempt,
        context_tokens,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
    `, [
      sessionId,
      turnData.turnNumber,
      turnData.modelUsed,
      turnData.tokensIn,
      turnData.tokensOut,
      turnData.latencyMs,
      turnData.eigScore,
      turnData.slotCoveragePercent,
      turnData.fatigueScore,
      turnData.similarityMatch,
      turnData.stopReason,
      turnData.questionIntent,
      turnData.questionConfidence,
      turnData.templateId,
      turnData.generationAttempt,
      turnData.contextTokens
    ]);
    
    await client.query('COMMIT');
    console.log(`📊 Logged turn metrics for session ${sessionId}, turn ${turnData.turnNumber}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error logging turn metrics:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Log answer processing metrics
 */
export async function logAnswerMetrics(sessionId, turnNumber, answerData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update existing turn record with answer metrics
    await client.query(`
      UPDATE survey_turn_telemetry 
      SET 
        answer_length = $3,
        extraction_model = $4,
        extraction_tokens = $5,
        extraction_latency_ms = $6,
        slots_extracted = $7,
        avg_extraction_confidence = $8,
        validation_passed = $9,
        updated_at = NOW()
      WHERE session_id = $1 AND turn_number = $2
    `, [
      sessionId,
      turnNumber,
      answerData.answerLength,
      answerData.extractionModel,
      answerData.extractionTokens,
      answerData.extractionLatencyMs,
      answerData.slotsExtracted,
      answerData.avgExtractionConfidence,
      answerData.validationPassed
    ]);
    
    await client.query('COMMIT');
    console.log(`📊 Updated answer metrics for session ${sessionId}, turn ${turnNumber}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error logging answer metrics:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Log brief generation metrics
 */
export async function logBriefMetrics(sessionId, briefData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Insert brief generation record
    await client.query(`
      INSERT INTO survey_brief_telemetry (
        session_id,
        model_used,
        tokens_in,
        tokens_out,
        latency_ms,
        brief_length,
        sections_generated,
        validation_passed,
        readiness_percentage,
        total_turns,
        total_questions,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    `, [
      sessionId,
      briefData.modelUsed,
      briefData.tokensIn,
      briefData.tokensOut,
      briefData.latencyMs,
      briefData.briefLength,
      briefData.sectionsGenerated,
      briefData.validationPassed,
      briefData.readinessPercentage,
      briefData.totalTurns,
      briefData.totalQuestions
    ]);
    
    await client.query('COMMIT');
    console.log(`📊 Logged brief metrics for session ${sessionId}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error logging brief metrics:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get aggregated metrics for analytics
 */
export async function getAggregatedMetrics(startDate, endDate) {
  const client = await pool.connect();
  try {
    // Get turn-level metrics
    const turnMetrics = await client.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_turns,
        AVG(latency_ms) as avg_latency,
        AVG(eig_score) as avg_eig,
        AVG(slot_coverage_percent) as avg_coverage,
        AVG(fatigue_score) as avg_fatigue,
        AVG(context_tokens) as avg_context_tokens,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM survey_turn_telemetry 
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [startDate, endDate]);
    
    // Get model usage stats
    const modelStats = await client.query(`
      SELECT 
        model_used,
        COUNT(*) as usage_count,
        AVG(latency_ms) as avg_latency,
        AVG(tokens_in + tokens_out) as avg_tokens
      FROM survey_turn_telemetry 
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY model_used
      ORDER BY usage_count DESC
    `, [startDate, endDate]);
    
    // Get brief generation stats
    const briefStats = await client.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as briefs_generated,
        AVG(latency_ms) as avg_latency,
        AVG(readiness_percentage) as avg_readiness,
        AVG(total_turns) as avg_turns_to_brief
      FROM survey_brief_telemetry 
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [startDate, endDate]);
    
    return {
      turnMetrics: turnMetrics.rows,
      modelStats: modelStats.rows,
      briefStats: briefStats.rows
    };
    
  } catch (error) {
    console.error('Error getting aggregated metrics:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get session-level metrics
 */
export async function getSessionMetrics(sessionId) {
  const client = await pool.connect();
  try {
    const sessionData = await client.query(`
      SELECT 
        stt.*,
        sbt.brief_length,
        sbt.readiness_percentage,
        sbt.total_turns as brief_total_turns
      FROM survey_turn_telemetry stt
      LEFT JOIN survey_brief_telemetry sbt ON stt.session_id = sbt.session_id
      WHERE stt.session_id = $1
      ORDER BY stt.turn_number ASC
    `, [sessionId]);
    
    return sessionData.rows;
    
  } catch (error) {
    console.error('Error getting session metrics:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create telemetry tables if they don't exist
 */
export async function createTelemetryTables() {
  const client = await pool.connect();
  try {
    // Create turn telemetry table
    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_turn_telemetry (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        turn_number INTEGER NOT NULL,
        model_used VARCHAR(100),
        tokens_in INTEGER DEFAULT 0,
        tokens_out INTEGER DEFAULT 0,
        latency_ms INTEGER DEFAULT 0,
        eig_score DECIMAL(3,2),
        slot_coverage_percent DECIMAL(5,2),
        fatigue_score DECIMAL(3,2),
        similarity_match DECIMAL(3,2),
        stop_reason VARCHAR(100),
        question_intent VARCHAR(100),
        question_confidence DECIMAL(3,2),
        template_id VARCHAR(100),
        generation_attempt INTEGER DEFAULT 1,
        context_tokens INTEGER DEFAULT 0,
        answer_length INTEGER DEFAULT 0,
        extraction_model VARCHAR(100),
        extraction_tokens INTEGER DEFAULT 0,
        extraction_latency_ms INTEGER DEFAULT 0,
        slots_extracted INTEGER DEFAULT 0,
        avg_extraction_confidence DECIMAL(3,2),
        validation_passed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create brief telemetry table
    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_brief_telemetry (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        model_used VARCHAR(100),
        tokens_in INTEGER DEFAULT 0,
        tokens_out INTEGER DEFAULT 0,
        latency_ms INTEGER DEFAULT 0,
        brief_length INTEGER DEFAULT 0,
        sections_generated INTEGER DEFAULT 0,
        validation_passed BOOLEAN DEFAULT false,
        readiness_percentage DECIMAL(5,2),
        total_turns INTEGER DEFAULT 0,
        total_questions INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_survey_turn_telemetry_session_id 
      ON survey_turn_telemetry(session_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_survey_turn_telemetry_created_at 
      ON survey_turn_telemetry(created_at)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_survey_brief_telemetry_session_id 
      ON survey_brief_telemetry(session_id)
    `);
    
    console.log('✅ Telemetry tables created successfully');
    
  } catch (error) {
    console.error('Error creating telemetry tables:', error);
    throw error;
  } finally {
    client.release();
  }
}
