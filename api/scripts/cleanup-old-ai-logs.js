#!/usr/bin/env node
/**
 * AI Log Cleanup Script
 * 
 * Runs daily to clean up old AI logs according to retention policy
 * Can be run manually or via cron job
 */

import { pool } from '../src/database/connection.js';
import { createSafeLogData } from '../src/utils/piiRedactor.js';

// Configuration
const DEFAULT_RETENTION_DAYS = 90;
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE_CLEANUP = process.argv.includes('--force');
const VERBOSE = process.argv.includes('--verbose');

/**
 * Get retention period from environment or use default
 */
function getRetentionDays() {
  const envRetention = process.env.AI_LOG_RETENTION_DAYS;
  if (envRetention) {
    const days = parseInt(envRetention, 10);
    if (days > 0 && days <= 365) {
      return days;
    }
  }
  return DEFAULT_RETENTION_DAYS;
}

/**
 * Log with timestamp
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

/**
 * Get cleanup statistics
 */
async function getCleanupStats(retentionDays) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '1 day' * $1) as logs_to_delete,
        COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '1 day' * ($1 - 7)) as logs_to_anonymize,
        MIN(created_at) as oldest_log,
        MAX(created_at) as newest_log,
        ROUND(
          (pg_total_relation_size('ai_session_logs') / 1024.0 / 1024.0)::NUMERIC, 2
        ) as storage_mb
      FROM ai_session_logs
    `, [retentionDays]);
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Perform cleanup of old AI logs
 */
async function cleanupOldLogs(retentionDays) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // First, anonymize logs that are approaching retention limit
    log(`Anonymizing logs older than ${retentionDays - 7} days...`);
    const anonymizeResult = await client.query(`
      UPDATE ai_session_logs 
      SET 
        ai_response = jsonb_build_object(
          'anonymized', true,
          'original_size', jsonb_array_length(ai_response),
          'anonymized_at', NOW()
        ),
        error_message = CASE 
          WHEN error_message IS NOT NULL THEN '[ANONYMIZED]'
          ELSE NULL
        END
      WHERE created_at < NOW() - INTERVAL '1 day' * $1
        AND ai_response IS NOT NULL
    `, [retentionDays - 7]);
    
    log(`Anonymized ${anonymizeResult.rowCount} logs`);
    
    // Then delete logs older than retention period
    log(`Deleting logs older than ${retentionDays} days...`);
    const deleteResult = await client.query(`
      DELETE FROM ai_session_logs 
      WHERE created_at < NOW() - INTERVAL '1 day' * $1
    `, [retentionDays]);
    
    log(`Deleted ${deleteResult.rowCount} logs`);
    
    await client.query('COMMIT');
    
    return {
      anonymized: anonymizeResult.rowCount,
      deleted: deleteResult.rowCount
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Perform dry run (show what would be deleted without actually deleting)
 */
async function dryRunCleanup(retentionDays) {
  const client = await pool.connect();
  try {
    log('🔍 DRY RUN - No actual changes will be made');
    
    // Show logs that would be anonymized
    const anonymizePreview = await client.query(`
      SELECT 
        id,
        session_id,
        ai_action,
        created_at,
        LENGTH(ai_response::text) as response_size
      FROM ai_session_logs 
      WHERE created_at < NOW() - INTERVAL '1 day' * $1
        AND ai_response IS NOT NULL
      ORDER BY created_at ASC
      LIMIT 10
    `, [retentionDays - 7]);
    
    log(`Would anonymize ${anonymizePreview.rowCount} logs (showing first 10):`);
    anonymizePreview.rows.forEach(row => {
      log(`  - ID: ${row.id}, Session: ${row.session_id}, Action: ${row.ai_action}, Size: ${row.response_size} bytes`);
    });
    
    // Show logs that would be deleted
    const deletePreview = await client.query(`
      SELECT 
        id,
        session_id,
        ai_action,
        created_at
      FROM ai_session_logs 
      WHERE created_at < NOW() - INTERVAL '1 day' * $1
      ORDER BY created_at ASC
      LIMIT 10
    `, [retentionDays]);
    
    log(`Would delete ${deletePreview.rowCount} logs (showing first 10):`);
    deletePreview.rows.forEach(row => {
      log(`  - ID: ${row.id}, Session: ${row.session_id}, Action: ${row.ai_action}, Created: ${row.created_at}`);
    });
    
  } finally {
    client.release();
  }
}

/**
 * Generate compliance report
 */
async function generateComplianceReport() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM get_retention_compliance_report()
    `);
    
    const stats = result.rows[0];
    
    log('📊 AI Log Retention Compliance Report:');
    log(`  Total logs: ${stats.total_logs}`);
    log(`  Logs older than 30 days: ${stats.logs_older_than_30_days}`);
    log(`  Logs older than 60 days: ${stats.logs_older_than_60_days}`);
    log(`  Logs older than 90 days: ${stats.logs_older_than_90_days}`);
    log(`  Oldest log: ${stats.oldest_log_date}`);
    log(`  Newest log: ${stats.newest_log_date}`);
    log(`  Storage used: ${stats.estimated_storage_mb} MB`);
    
    return stats;
  } finally {
    client.release();
  }
}

/**
 * Main cleanup function
 */
async function main() {
  const retentionDays = getRetentionDays();
  
  log(`🧹 Starting AI log cleanup (retention: ${retentionDays} days)`);
  
  try {
    // Get initial statistics
    const initialStats = await getCleanupStats(retentionDays);
    log(`📈 Initial stats: ${initialStats.total_logs} total logs, ${initialStats.logs_to_delete} to delete, ${initialStats.storage_mb} MB storage`);
    
    if (DRY_RUN) {
      await dryRunCleanup(retentionDays);
    } else {
      // Perform actual cleanup
      const cleanupResults = await cleanupOldLogs(retentionDays);
      log(`✅ Cleanup completed: ${cleanupResults.anonymized} anonymized, ${cleanupResults.deleted} deleted`);
    }
    
    // Get final statistics
    const finalStats = await getCleanupStats(retentionDays);
    log(`📈 Final stats: ${finalStats.total_logs} total logs, ${finalStats.storage_mb} MB storage`);
    
    // Generate compliance report
    if (VERBOSE) {
      await generateComplianceReport();
    }
    
    log('🎉 AI log cleanup completed successfully');
    
  } catch (error) {
    log(`❌ Cleanup failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', async () => {
  log('🛑 Received SIGINT, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('🛑 Received SIGTERM, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Run main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log(`💥 Unhandled error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  });
}

export { main, getCleanupStats, generateComplianceReport };
