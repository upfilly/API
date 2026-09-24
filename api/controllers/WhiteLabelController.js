module.exports = {
  /**
   * Step C: Subdomain availability check (debounced from frontend)
   */
  checkSubdomain: async function(req, res) {
    const slug = req.body.slug;
    
    if (!slug || typeof slug !== 'string') {
      return res.badRequest({ message: 'Subdomain slug is required' });
    }
    
    const formattedSlug = slug.toLowerCase().trim();
    
    // 1. Validation Rules: Lowercase a-z, 0-9, hyphen. 3-30 chars, no leading/trailing hyphen.
    const slugRegex = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
    if (!slugRegex.test(formattedSlug)) {
      return res.badRequest({ message: 'Invalid slug format. Must be 3-30 lowercase alphanumeric characters, cannot start or end with a hyphen.' });
    }
    
    // 2. Blocklist Check
    const blocklist = ['admin', 'api', 'app', 'www', 'mail', 'smtp', 'ftp', 'status', 'support', 'help', 'docs', 'blog', 'cdn', 'static', 'track', 'click', 'dashboard', 'login', 'billing', 'upfilly'];
    if (blocklist.includes(formattedSlug)) {
      return res.badRequest({ message: 'This subdomain is reserved and cannot be used.' });
    }
    
    try {
      // 3. Database Check
      const existingUser = await Users.findOne({ sub_domain: formattedSlug });
      if (existingUser) {
        return res.badRequest({ message: 'Subdomain is already taken.' });
      }
      
      return res.ok({ message: 'Subdomain is available.', slug: formattedSlug });
    } catch (err) {
      return res.serverError(err);
    }
  }
};
