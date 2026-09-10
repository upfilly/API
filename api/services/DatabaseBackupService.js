const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { exec } = require('child_process');
const moment = require('moment');

// Path to store backups
const BACKUP_DIR = path.resolve(__dirname, '../../backups');
const MAX_BACKUP_DAYS = 7;
const BACKUP_FILE_PATTERN = /^backup_.*\.gz$/;

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
    .filter(file => BACKUP_FILE_PATTERN.test(file))
    .map(file => {
      const filePath = path.join(backupDir, file);
      try {
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          filePath,
          mtime: stats.mtime,
          mtimeMs: stats.mtimeMs,
          size: stats.size
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
        fs.unlinkSync(oldestFile.filePath);
        console.log(`[DatabaseBackupService] Deleted oldest backup file: ${oldestFile.filename}`);
        deletedFiles.push(oldestFile.filename);
      }
    } catch (err) {
      console.error(`[DatabaseBackupService] Error deleting backup file ${oldestFile.filename}:`, err);
    }
  }

  // 2. Also remove any backups strictly older than MAX_BACKUP_DAYS (e.g. 7 days old)
  const cutoffTime = Date.now() - MAX_BACKUP_DAYS * 24 * 60 * 60 * 1000;
  for (let i = existingFiles.length - 1; i >= 0; i--) {
    const file = existingFiles[i];
    if (file.mtimeMs < cutoffTime) {
      try {
        if (fs.existsSync(file.filePath)) {
          fs.unlinkSync(file.filePath);
          console.log(`[DatabaseBackupService] Deleted expired backup file (> 7 days): ${file.filename}`);
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
 * Dump database using mongodump CLI
 */
function dumpWithMongodump(backupFilePath, credentials) {
  return new Promise((resolve, reject) => {
    const { host, port, user, password, dbName, authDb } = credentials;

    let cmd = `mongodump --host "${host}" --port "${port}" --db "${dbName}" --archive="${backupFilePath}" --gzip`;
    if (user && password) {
      cmd += ` --username "${user}" --password "${password}" --authenticationDatabase "${authDb}"`;
    }

    exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`mongodump failed: ${stderr || error.message}`));
      }
      resolve({ stdout, stderr });
    });
  });
}

/**
 * Fallback dump using Sails/MongoDB native driver
 */
async function dumpWithNativeDriver(backupFilePath, dbName) {
  if (typeof sails === 'undefined' || !sails.getDatastore) {
    throw new Error('Sails datastore not accessible for native backup fallback');
  }

  const datastore = sails.getDatastore();
  const db = datastore.manager;
  if (!db) {
    throw new Error('Active MongoDB database handle not available from Sails datastore');
  }

  const collections = await db.listCollections().toArray();
  const writeStream = fs.createWriteStream(backupFilePath);
  const gzipStream = zlib.createGzip();

  return new Promise((resolve, reject) => {
    gzipStream.pipe(writeStream);

    writeStream.on('error', reject);
    gzipStream.on('error', reject);

    (async () => {
      try {
        gzipStream.write('{\n  "database": ' + JSON.stringify(dbName) + ',\n  "timestamp": ' + JSON.stringify(new Date().toISOString()) + ',\n  "collections": {\n');

        for (let i = 0; i < collections.length; i++) {
          const colInfo = collections[i];
          const colName = colInfo.name;

          // Skip system collections
          if (colName.startsWith('system.')) continue;

          const collection = db.collection(colName);
          const docs = await collection.find({}).toArray();

          const isLastCol = (i === collections.length - 1);
          const colJson = `    ${JSON.stringify(colName)}: ${JSON.stringify(docs)}${isLastCol ? '' : ','}\n`;
          gzipStream.write(colJson);
        }

        gzipStream.write('  }\n}\n');
        gzipStream.end();

        writeStream.on('finish', () => {
          resolve({ method: 'native_driver' });
        });
      } catch (err) {
        gzipStream.destroy();
        writeStream.destroy();
        reject(err);
      }
    })();
  });
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

    console.log(`[DatabaseBackupService] Initiating daily database backup at ${new Date().toISOString()}`);

    // Ensure directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Step 1: Check existing backup files.
    // If there are already 7 or more backup files, delete the oldest backup file(s)
    // so there is space for the new backup (keeping total <= 7).
    const preCleanup = cleanupOldBackups(maxDays, backupDir);
    if (preCleanup.deletedFiles.length > 0) {
      console.log(`[DatabaseBackupService] Pre-backup cleanup deleted ${preCleanup.deletedFiles.length} oldest file(s): ${preCleanup.deletedFiles.join(', ')}`);
    }

    // Step 2: Generate filename and execute backup
    const creds = getDbCredentials();
    const timestampStr = moment().format('YYYY-MM-DD_HH-mm-ss');
    const filename = `backup_${creds.dbName}_${timestampStr}.gz`;
    const targetFilePath = path.join(backupDir, filename);

    let backupMethod = 'mongodump';
    try {
      await dumpWithMongodump(targetFilePath, creds);
      console.log(`[DatabaseBackupService] Backup successfully created via mongodump: ${filename}`);
    } catch (mongodumpErr) {
      console.warn(`[DatabaseBackupService] mongodump encountered an issue (${mongodumpErr.message}), attempting native driver fallback...`);
      try {
        await dumpWithNativeDriver(targetFilePath, creds.dbName);
        backupMethod = 'native_driver';
        console.log(`[DatabaseBackupService] Backup successfully created via native driver fallback: ${filename}`);
      } catch (nativeErr) {
        // If file was partially written, remove it
        if (fs.existsSync(targetFilePath)) {
          try { fs.unlinkSync(targetFilePath); } catch (e) {}
        }
        console.error('[DatabaseBackupService] Backup failed on all available methods:', nativeErr);
        throw new Error(`Database backup failed: mongodump error: ${mongodumpErr.message}; native error: ${nativeErr.message}`);
      }
    }

    // Step 3: Verify new backup file exists and has size
    const fileStats = fs.statSync(targetFilePath);
    if (fileStats.size === 0) {
      throw new Error(`Generated backup file ${filename} is empty (0 bytes).`);
    }

    // Step 4: Final verification to guarantee at most 7 days of backups
    cleanupOldBackups(maxDays + 1, backupDir);
    const activeBackups = getSortedBackupFiles(backupDir);

    console.log(`[DatabaseBackupService] Successfully finished backup. Total active backups: ${activeBackups.length}/${maxDays}`);

    return {
      success: true,
      filename,
      filePath: targetFilePath,
      sizeBytes: fileStats.size,
      method: backupMethod,
      totalActiveBackups: activeBackups.length,
      backups: activeBackups.map(b => b.filename)
    };
  }
};
