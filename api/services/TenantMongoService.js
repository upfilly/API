const { MongoClient } = require('mongodb');

let client;

module.exports = {
  /**
   * Retrieves the MongoDB Native connection for a specific tenant based on their subdomain.
   * Caches the client pool so it's only created once.
   */
  getTenantDb: async function(subdomain) {
    if (!client) {
      // Connect using the default datastore URL from config
      const url = sails.config.datastores.default.url;
      client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
      await client.connect();
    }
    
    // Construct a unique database name for the tenant
    const dbName = `tenant_${subdomain.replace(/[^a-z0-9]/g, '')}`;
    return client.db(dbName);
  },
  
  /**
   * Physically creates the database by inserting a default setup document.
   * (In MongoDB, a database is not physically created until data is written to it)
   */
  createTenantDatabase: async function(subdomain) {
     const db = await this.getTenantDb(subdomain);
     
     // To physically create the DB in Mongo, we just need to insert a document or create a collection
     await db.collection('tenant_metadata').updateOne(
         { _id: 'config' },
         { $set: { subdomain: subdomain, createdAt: new Date(), status: 'active' } },
         { upsert: true }
     );
     
     const dbName = `tenant_${subdomain.replace(/[^a-z0-9]/g, '')}`;
     return { db, dbName };
  }
};
