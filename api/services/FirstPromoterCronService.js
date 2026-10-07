/**
 * FirstPromoterCronService.js
 *
 * @description :: Cron service to fetch CSV data from all active FirstPromoter accounts
 *                 and sync new records into the firstpromoterdata collection.
 *                 Duplicate records (matched by lead_email + firstPromoterId) are skipped.
 */

const ObjectId = require('mongodb').ObjectId;
const scalenutServices = require('./scalenutServices');

/**
 * Sync CSV data for a single FirstPromoter record.
 * - Uses scalenutServices.exportScalenutData to login & export CSV
 * - Inserts only new records into firstpromoterdata (skips duplicates by lead_email + firstPromoterId)
 *
 * @param {Object} promoter FirstPromoter document
 * @returns {Promise<{inserted: number, skipped: number, failed: number}>}
 */
const syncSingleFirstPromoter = async (promoter) => {
  const db = sails.getDatastore().manager;
  let inserted = 0;
  let skipped  = 0;
  let failed   = 0;

  const promoterLabel = `[Promoter: ${promoter.email} | ID: ${promoter.id}]`;

  if (!promoter.email || !promoter.password || !promoter.url) {
    console.warn(`${promoterLabel} Missing email/password/url – skipping.`);
    return { inserted, skipped, failed: 1 };
  }

  console.log(`${promoterLabel} Fetching CSV data...`);

  const exportResult = await scalenutServices.exportScalenutData({
    email:    promoter.email,
    password: promoter.password,
    url:      promoter.url,
  });

  if (!exportResult || !exportResult.success) {
    console.error(`${promoterLabel} Export failed: ${exportResult ? exportResult.msg : 'unknown error'}`);
    return { inserted, skipped, failed: 1 };
  }

  const rows = exportResult.data || [];
  console.log(`${promoterLabel} Export returned ${rows.length} row(s).`);

  if (rows.length === 0) {
    return { inserted, skipped, failed: 0 };
  }

  for (const record of rows) {
    try {
      const leadEmail       = record.lead_email || '';
      const firstPromoterId = promoter.id ? promoter.id.toString() : '';

      const existingCount = await db.collection('firstpromoterdata').countDocuments({
        lead_email:      leadEmail,
        firstPromoterId: firstPromoterId,
        isDeleted:       false,
      });

      if (existingCount > 0) {
        skipped++;
        continue;
      }

      const newRecord = {
        lead_email:      leadEmail,
        lead_id:         record.lead_id || '',
        sub_id:          (record.sub_id && ObjectId.isValid(record.sub_id))
                           ? new ObjectId(record.sub_id)
                           : (record.sub_id || ''),
        earnings:        record.earnings
                           ? parseFloat(record.earnings.replace('$', '')) || 0
                           : 0,
        created_at:      record.created_at ? new Date(record.created_at) : new Date(),
        firstPromoterId: firstPromoterId,
        status:          'active',
        isDeleted:       false,
        createdAt:       new Date(),
        updatedAt:       new Date(),
      };

      await db.collection('firstpromoterdata').insertOne(newRecord);
      inserted++;
    } catch (rowErr) {
      console.error(`${promoterLabel} Error inserting row:`, rowErr.message);
      failed++;
    }
  }

  console.log(`${promoterLabel} Done – inserted: ${inserted}, skipped (duplicates): ${skipped}`);
  return { inserted, skipped, failed };
};

exports.syncSingleFirstPromoter = syncSingleFirstPromoter;

/**
 * Fetch and sync FirstPromoter CSV data for all active, non-deleted promoters.
 *
 * @returns {Promise<{processed: number, inserted: number, skipped: number, failed: number}>}
 */
exports.syncAllFirstPromoterData = async () => {
  let processed = 0;
  let inserted  = 0;
  let skipped   = 0;
  let failed    = 0;

  try {
    console.log('[FirstPromoterCron] Starting daily FirstPromoter CSV sync...');

    const promoters = await FirstPromoter.find({ isDeleted: false, status: 'active' });

    if (!promoters || promoters.length === 0) {
      console.log('[FirstPromoterCron] No active FirstPromoter records found. Exiting.');
      return { processed, inserted, skipped, failed };
    }

    console.log(`[FirstPromoterCron] Found ${promoters.length} active promoter(s) to process.`);

    for (const promoter of promoters) {
      processed++;
      try {
        const result = await syncSingleFirstPromoter(promoter);
        inserted += result.inserted;
        skipped  += result.skipped;
        failed   += result.failed;
      } catch (promoterErr) {
        console.error(`[Promoter: ${promoter.email}] Unexpected error:`, promoterErr.message || promoterErr);
        failed++;
      }
    }

    console.log(`[FirstPromoterCron] Sync complete. Processed: ${processed} | Inserted: ${inserted} | Skipped: ${skipped} | Failed: ${failed}`);
    return { processed, inserted, skipped, failed };

  } catch (err) {
    console.error('[FirstPromoterCron] Fatal error during sync:', err.message || err);
    return { processed, inserted, skipped, failed, error: err.message };
  }
};
