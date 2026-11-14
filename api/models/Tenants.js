/**
 * Tenants.js
 *
 * @description :: Master registry of registered businesses (white-label tenants).
 *                 Stores domain information, dedicated database names, and platform plan subscription state.
 */

module.exports = {
  schema: true,
  migrate: 'safe',
  attributes: {
    // Basic Organization Info
    business_name: {
      type: 'string',
      required: true
    },
    subdomain: {
      type: 'string',
      required: true,
      unique: true
    },
    whitelabel_type: {
      type: 'string',
      isIn: ['merchant', 'network'],
      defaultsTo: 'merchant'
    },

    // 4-Step Resumable Onboarding Progress State
    onboarding_step: {
      type: 'string',
      isIn: ['step_a', 'step_b', 'step_c', 'step_d', 'completed'],
      defaultsTo: 'step_a'
    },
    onboarding_progress: {
      type: 'json',
      defaultsTo: { step_a: false, step_b: false, step_c: false, step_d: false }
    },
    onboarding_session_token: {
      type: 'string',
      allowNull: true
    },

    // Step A: Account / Identity Fields
    first_name: {
      type: 'string'
    },
    last_name: {
      type: 'string'
    },
    job_title: {
      type: 'string',
      allowNull: true
    },
    phone: {
      type: 'string'
    },
    terms_and_conditions: {
      type: 'boolean',
      defaultsTo: false
    },

    // Step B: Business Details & Invoicing
    legal_company_name: {
      type: 'string'
    },
    trading_name: {
      type: 'string',
      allowNull: true
    },
    company_registration_number: {
      type: 'string',
      allowNull: true
    },
    vat_tax_id: {
      type: 'string',
      allowNull: true
    },
    registered_address: {
      type: 'json'
    },
    billing_email: {
      type: 'string'
    },
    company_website: {
      type: 'string',
      allowNull: true
    },
    industry: {
      type: 'string',
      allowNull: true
    },

    // Step C: Domains & Network Tracking Domain
    custom_domain: {
      type: 'string',
      allowNull: true
    },
    cname_status: {
      type: 'string',
      isIn: ['pending', 'verified', 'failed'],
      defaultsTo: 'pending'
    },
    ssl_status: {
      type: 'string',
      isIn: ['pending', 'active', 'failed'],
      defaultsTo: 'pending'
    },
    tracking_domain: {
      type: 'string',
      allowNull: true
    },
    tracking_domain_status: {
      type: 'string',
      isIn: ['not_started', 'pending_dns', 'verifying', 'active', 'failed'],
      defaultsTo: 'not_started'
    },
    cname_target: {
      type: 'string',
      defaultsTo: 'cname.upfilly.com'
    },
    dns_last_checked_at: {
      type: 'ref',
      columnType: 'datetime'
    },

    // Step D: Stripe Connection (Bring Your Own Key - BYOK)
    stripe_connection_mode: {
      type: 'string',
      isIn: ['byok_keys', 'platform_hosted'],
      defaultsTo: 'byok_keys'
    },
    tenant_stripe_publishable_key: {
      type: 'string',
      allowNull: true
    },
    tenant_stripe_secret_key: {
      type: 'string',
      allowNull: true
    },
    tenant_stripe_environment: {
      type: 'string',
      isIn: ['test', 'live'],
      defaultsTo: 'test'
    },
    tenant_stripe_currency: {
      type: 'string',
      defaultsTo: 'USD'
    },
    statement_descriptor: {
      type: 'string',
      allowNull: true
    },

    // Database Isolation
    db_name: {
      type: 'string',
      required: true
    },
    db_connection_uri: {
      type: 'string',
      allowNull: true
    },

    // Admin Credentials & Contact
    admin_email: {
      type: 'string',
      required: true,
      unique: true
    },
    admin_name: {
      type: 'string'
    },
    master_user_id: {
      type: 'string',
      allowNull: true
    },
    is_existing_brand_upgrade: {
      type: 'boolean',
      defaultsTo: false
    },

    // Plan & Billing Lifecycle
    plan_status: {
      type: 'string',
      isIn: ['pending_payment', 'trialing', 'active', 'past_due', 'canceled'],
      defaultsTo: 'pending_payment'
    },
    plan_id: {
      model: 'platformplans'
    },
    stripe_customer_id: {
      type: 'string',
      allowNull: true
    },
    stripe_subscription_id: {
      type: 'string',
      allowNull: true
    },
    current_period_end: {
      type: 'ref',
      columnType: 'datetime'
    },

    // Network Assisted Onboarding Call Tracking
    onboarding_call_booked: {
      type: 'boolean',
      defaultsTo: false
    },
    onboarding_call_scheduled_at: {
      type: 'ref',
      columnType: 'datetime'
    },
    onboarding_completed: {
      type: 'boolean',
      defaultsTo: false
    },
    onboarding_checklist: {
      type: 'json',
      defaultsTo: { tracking_domain: false, branding: false, team_invites: false }
    },

    // Branding & Status
    branding: {
      type: 'json'
    },
    status: {
      type: 'string',
      isIn: ['active', 'deactive', 'suspended', 'deleted'],
      defaultsTo: 'active'
    },
    isDeleted: {
      type: 'boolean',
      defaultsTo: false
    }
  }
};
