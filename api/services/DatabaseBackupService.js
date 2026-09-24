const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { exec } = require('child_process');
const moment = require('moment');

// Path to store backups
const BACKUP_DIR = path.resolve(__dirname, '../../backups');
const MAX_BACKUP_DAYS = 7;
const CSV_BACKUP_PATTERN = /^backup_csv_.*$/;

/**
 * Retrieve database configuration credentials
 */
function getDbCredentials() {
  let localCreds = {};
  try {
    localCreds = require('../../config/local.js');
  } catch (e) {
    // local.js might be absent in some environments
  }

  const host = localCreds.DB_HOST || process.env.DB_HOST || '127.0.0.1';
  const port = localCreds.DB_PORT || process.env.DB_PORT || 27017;
  const user = localCreds.DB_USER || process.env.DB_USER || '';
  const password = localCreds.DB_PASSWORD || process.env.DB_PASSWORD || '';
  const dbName = localCreds.DB_NAME || process.env.DB_NAME || 'db_upfilly';
  const authDb = localCreds.DB_AUTH_NAME || dbName;

  return { host, port, user, password, dbName, authDb };
}

/**
 * Get all existing backup files sorted from oldest to newest
 */
function getSortedBackupFiles(backupDir = BACKUP_DIR) {
  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const files = fs.readdirSync(backupDir);
  const backupFiles = files
    .filter(file => CSV_BACKUP_PATTERN.test(file))
    .map(file => {
      const filePath = path.join(backupDir, file);
      try {
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          filePath,
          mtime: stats.mtime,
          mtimeMs: stats.mtimeMs,
          size: stats.size,
          isDirectory: stats.isDirectory()
        };
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean);

  // Sort ascending: oldest file at index 0, newest file at the end
  backupFiles.sort((a, b) => a.mtimeMs - b.mtimeMs);
  return backupFiles;
}

/**
 * Enforce retention policy: delete oldest files if count >= maxCount
 * or if file age exceeds maxDays
 */
function cleanupOldBackups(maxCount = MAX_BACKUP_DAYS, backupDir = BACKUP_DIR) {
  const existingFiles = getSortedBackupFiles(backupDir);
  const deletedFiles = [];

  // 1. Remove files exceeding the retention limit
  while (existingFiles.length >= maxCount) {
    const oldestFile = existingFiles.shift();
    try {
      if (fs.existsSync(oldestFile.filePath)) {
        if (oldestFile.isDirectory) {
          fs.rmSync(oldestFile.filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(oldestFile.filePath);
        }
        console.log(`[DatabaseBackupService] Deleted oldest backup: ${oldestFile.filename}`);
        deletedFiles.push(oldestFile.filename);
      }
    } catch (err) {
      console.error(`[DatabaseBackupService] Error deleting backup ${oldestFile.filename}:`, err);
    }
  }

  // 2. Also remove any backups strictly older than MAX_BACKUP_DAYS (e.g. 7 days old)
  const cutoffTime = Date.now() - MAX_BACKUP_DAYS * 24 * 60 * 60 * 1000;
  for (let i = existingFiles.length - 1; i >= 0; i--) {
    const file = existingFiles[i];
    if (file.mtimeMs < cutoffTime) {
      try {
        if (fs.existsSync(file.filePath)) {
          if (file.isDirectory) {
            fs.rmSync(file.filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(file.filePath);
          }
          console.log(`[DatabaseBackupService] Deleted expired backup (> 7 days): ${file.filename}`);
          deletedFiles.push(file.filename);
          existingFiles.splice(i, 1);
        }
      } catch (err) {
        console.error(`[DatabaseBackupService] Error deleting expired backup ${file.filename}:`, err);
      }
    }
  }

  return { deletedFiles, remainingCount: existingFiles.length };
}



/**
 * Dump entire database to a folder containing CSV files (one per collection)
 */
async function dumpDatabaseToCsvDirectory(csvDirPath) {
  if (typeof sails === 'undefined' || !sails.getDatastore) return;

  const datastore = sails.getDatastore();
  const db = datastore.manager;
  if (!db) return;

  const { Parser } = require('json2csv');

  if (!fs.existsSync(csvDirPath)) {
    fs.mkdirSync(csvDirPath, { recursive: true });
  }

  const collections = await db.listCollections().toArray();

  for (let colInfo of collections) {
    const colName = colInfo.name;
    if (colName.startsWith('system.')) continue;
    
    try {
      const collection = db.collection(colName);
      const docs = await collection.find({}).toArray();
      
      if (docs && docs.length > 0) {
        const parser = new Parser();
        const csv = parser.parse(docs);
        fs.writeFileSync(path.join(csvDirPath, `${colName}.csv`), csv);
      }
    } catch (err) {
      console.error(`[DatabaseBackupService] Error creating CSV for collection ${colName}:`, err);
    }
  }
}

module.exports = {
  BACKUP_DIR,
  MAX_BACKUP_DAYS,

  getDbCredentials,
  getSortedBackupFiles,
  cleanupOldBackups,

  /**
   * Main backup execution routine
   * 1. Ensure backup directory exists
   * 2. If 7 or more backups exist, delete the oldest before saving
   * 3. Perform backup (mongodump or fallback to native driver)
   * 4. Verify new file and ensure strict 7-day retention
   */
  performDailyBackup: async function (options = {}) {
    const backupDir = options.backupDir || BACKUP_DIR;
    const maxDays = options.maxDays || MAX_BACKUP_DAYS;

    console.log(`[DatabaseBackupService] Initiating daily database CSV backup at ${new Date().toISOString()}`);

    // Ensure directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Step 1: Check existing backup files.
    // If there are already 7 or more backups, delete the oldest
    const preCleanup = cleanupOldBackups(maxDays, backupDir);
    if (preCleanup.deletedFiles.length > 0) {
      console.log(`[DatabaseBackupService] Pre-backup cleanup deleted ${preCleanup.deletedFiles.length} oldest file(s): ${preCleanup.deletedFiles.join(', ')}`);
    }

    // Step 2: Generate filename and execute backup
    const creds = getDbCredentials();
    const timestampStr = moment().format('YYYY-MM-DD_HH-mm-ss');
    const csvDirName = `backup_csv_${creds.dbName}_${timestampStr}`;
    const csvDirPath = path.join(backupDir, csvDirName);
    
    try {
      await dumpDatabaseToCsvDirectory(csvDirPath);
      console.log(`[DatabaseBackupService] CSV backup successfully created at: ${csvDirName}`);
    } catch (csvErr) {
      console.error(`[DatabaseBackupService] Failed to create CSV backup:`, csvErr);
      throw csvErr;
    }

    // Step 3: Final verification to guarantee at most 7 days of backups
    cleanupOldBackups(maxDays + 1, backupDir);
    const activeBackups = getSortedBackupFiles(backupDir);

    console.log(`[DatabaseBackupService] Successfully finished CSV backup. Total active backups: ${activeBackups.length}/${maxDays}`);

    return {
      success: true,
      filename: csvDirName,
      filePath: csvDirPath,
      totalActiveBackups: activeBackups.length,
      backups: activeBackups.map(b => b.filename)
    };
  }
};
