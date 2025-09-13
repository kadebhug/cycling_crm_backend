#!/usr/bin/env node

/**
 * Script to process expired quotations
 * This can be run as a cron job to automatically expire quotations
 */

import { QuotationService } from '../services/quotation.service';
import { sequelize } from '../config/database';
import { initializeModels } from '../database/models';

async function processExpiredQuotations() {
  try {
    console.log('Starting expired quotations processing...');
    
    // Initialize database connection and models
    await sequelize.authenticate();
    initializeModels(sequelize);
    
    // Process expired quotations
    const quotationService = new QuotationService();
    const result = await quotationService.processExpiredQuotations();
    
    console.log(`Processed ${result.processed} expired quotations`);
    
    if (result.errors.length > 0) {
      console.error('Errors encountered:');
      result.errors.forEach((error, index) => {
        console.error(`${index + 1}. ${error}`);
      });
    }
    
    console.log('Expired quotations processing completed');
  } catch (error) {
    console.error('Failed to process expired quotations:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script if called directly
if (require.main === module) {
  processExpiredQuotations();
}

export { processExpiredQuotations };