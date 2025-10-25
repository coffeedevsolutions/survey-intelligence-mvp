/**
 * Base Repository Pattern
 * 
 * Provides common database operations and query patterns
 */

import { pool, query, transaction } from '../connection.js';

/**
 * Base repository class with common operations
 */
export class BaseRepository {
  constructor(tableName, primaryKey = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  /**
   * Find record by ID
   */
  async findById(id) {
    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find records by organization ID
   */
  async findByOrgId(orgId, limit = 50, offset = 0) {
    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [orgId, limit, offset]
    );
    return result.rows;
  }

  /**
   * Find all records
   */
  async findAll(limit = 50, offset = 0) {
    const result = await query(
      `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  /**
   * Create new record
   */
  async create(data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
    
    const result = await query(
      `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  }

  /**
   * Update record by ID
   */
  async updateById(id, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    
    const result = await query(
      `UPDATE ${this.tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE ${this.primaryKey} = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0] || null;
  }

  /**
   * Delete record by ID
   */
  async deleteById(id) {
    const result = await query(
      `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Soft delete (set archived_at)
   */
  async softDeleteById(id) {
    const result = await query(
      `UPDATE ${this.tableName} SET archived_at = CURRENT_TIMESTAMP WHERE ${this.primaryKey} = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Restore soft deleted record
   */
  async restoreById(id) {
    const result = await query(
      `UPDATE ${this.tableName} SET archived_at = NULL WHERE ${this.primaryKey} = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Count records
   */
  async count(whereClause = '', params = []) {
    const where = whereClause ? `WHERE ${whereClause}` : '';
    const result = await query(
      `SELECT COUNT(*) as count FROM ${this.tableName} ${where}`,
      params
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Check if record exists
   */
  async exists(id) {
    const result = await query(
      `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = $1 LIMIT 1`,
      [id]
    );
    return result.rows.length > 0;
  }

  /**
   * Execute custom query
   */
  async executeQuery(sql, params = []) {
    return await query(sql, params);
  }

  /**
   * Execute transaction
   */
  async executeTransaction(callback) {
    return await transaction(callback);
  }

  /**
   * Batch insert records
   */
  async batchInsert(records) {
    if (records.length === 0) return [];
    
    const fields = Object.keys(records[0]);
    const values = records.map(record => Object.values(record));
    
    const placeholders = values.map((_, recordIndex) => 
      `(${fields.map((_, fieldIndex) => `$${recordIndex * fields.length + fieldIndex + 1}`).join(', ')})`
    ).join(', ');
    
    const result = await query(
      `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES ${placeholders} RETURNING *`,
      values.flat()
    );
    
    return result.rows;
  }

  /**
   * Upsert record (insert or update)
   */
  async upsert(data, conflictColumns = [this.primaryKey]) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
    const setClause = fields.map((field, index) => `${field} = EXCLUDED.${field}`).join(', ');
    
    const result = await query(
      `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders}) 
       ON CONFLICT (${conflictColumns.join(', ')}) 
       DO UPDATE SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       RETURNING *`,
      values
    );
    
    return result.rows[0];
  }

  /**
   * Find records with pagination
   */
  async findWithPagination(options = {}) {
    const {
      where = '',
      params = [],
      orderBy = 'created_at DESC',
      limit = 50,
      offset = 0,
      orgId = null
    } = options;
    
    let whereClause = where;
    let queryParams = [...params];
    
    if (orgId) {
      whereClause = whereClause ? `${whereClause} AND org_id = $${queryParams.length + 1}` : `org_id = $${queryParams.length + 1}`;
      queryParams.push(orgId);
    }
    
    const whereSql = whereClause ? `WHERE ${whereClause}` : '';
    
    const result = await query(
      `SELECT * FROM ${this.tableName} ${whereSql} ORDER BY ${orderBy} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );
    
    return result.rows;
  }

  /**
   * Search records
   */
  async search(searchTerm, searchFields = [], options = {}) {
    const {
      orgId = null,
      limit = 50,
      offset = 0,
      orderBy = 'created_at DESC'
    } = options;
    
    if (searchFields.length === 0) {
      return this.findWithPagination({ orgId, limit, offset, orderBy });
    }
    
    const searchConditions = searchFields.map((field, index) => 
      `${field} ILIKE $${index + 1}`
    ).join(' OR ');
    
    let whereClause = `(${searchConditions})`;
    let queryParams = searchFields.map(() => `%${searchTerm}%`);
    
    if (orgId) {
      whereClause += ` AND org_id = $${queryParams.length + 1}`;
      queryParams.push(orgId);
    }
    
    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE ${whereClause} ORDER BY ${orderBy} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );
    
    return result.rows;
  }
}

/**
 * Repository factory function
 */
export function createRepository(tableName, primaryKey = 'id') {
  return new BaseRepository(tableName, primaryKey);
}

export default BaseRepository;
