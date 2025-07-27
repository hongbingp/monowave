#!/usr/bin/env node

require('dotenv').config();
const { pool } = require('../src/config/database');
const logger = require('../src/utils/logger');

async function checkDatabase() {
  const client = await pool.connect();
  try {
    logger.info('Checking database structure...\n');
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    logger.info('Tables in database:');
    tablesResult.rows.forEach((row, index) => {
      logger.info(`  ${index + 1}. ${row.table_name}`);
    });
    
    logger.info('\nTable details:\n');
    
    // Get details for each table
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      
      // Get column information
      const columnsResult = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [tableName]);
      
      // Get row count
      const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const rowCount = countResult.rows[0].count;
      
      logger.info(`📊 ${tableName.toUpperCase()} (${rowCount} rows)`);
      logger.info('   Columns:');
      
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
        const defaultVal = col.column_default ? ` default: ${col.column_default}` : '';
        logger.info(`     - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
      });
      
      logger.info('');
    }
    
    // Check indexes
    const indexesResult = await client.query(`
      SELECT 
        indexname,
        tablename,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    logger.info('📋 Database Indexes:');
    let currentTable = '';
    indexesResult.rows.forEach(idx => {
      if (idx.tablename !== currentTable) {
        logger.info(`\n  ${idx.tablename}:`);
        currentTable = idx.tablename;
      }
      logger.info(`    - ${idx.indexname}`);
    });
    
    // Check foreign key constraints
    const fkResult = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name
    `);
    
    logger.info('\n🔗 Foreign Key Relationships:');
    fkResult.rows.forEach(fk => {
      logger.info(`  ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
  } catch (error) {
    logger.error('Error checking database:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  checkDatabase();
}

module.exports = { checkDatabase };