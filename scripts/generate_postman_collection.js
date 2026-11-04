/**
 * scripts/generate_postman_collection.js
 *
 * @description :: Generates a complete, production-ready Postman Collection (v2.1.0)
 *                 covering all 316 API endpoints across the Upfilly platform.
 *                 Includes realistic JSON request payloads, headers, query parameters,
 *                 and environment variables.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const rootDir = path.resolve(__dirname, '..');
const routes = require(path.join(rootDir, 'config/routes.js')).routes;
const policies = require(path.join(rootDir, 'config/policies.js')).policies;

// Map alias controllers
const controllerAlias = {
  Banner: 'BannerController',
  Commission: 'CommissionController',
  UntracksaleSController: 'UntrackSalesController'
};

// Module grouping definition
const moduleGroups = [
  {
    name: '0. Platform SaaS & Multi-Tenancy (White-Label Control Plane)',
    description: 'Endpoints for platform business registration, dedicated database provisioning, SaaS plan subscriptions, Stripe billing webhooks, and custom domain setup.',
    controllers: ['PlatformController']
  },
  {
    name: '1. Authentication, Identity & User Management',
    description: 'User registration, login, password recovery, verification, RBAC permissions, profile management, and audit trails.',
    controllers: ['UsersController', 'RolesController', 'PermissionsController', 'ActivityHistoryController', 'AuditTrialsController']
  },
  {
    name: '2. Affiliate Management & Network Collaboration',
    description: 'Affiliate onboarding, grouping, brand invites, campaign join requests, proposals, direct offers, and invited user management.',
    controllers: ['AffiliateManagementController', 'AffiliateInviteController', 'AffiliateBrandInviteController', 'InviteUserController', 'InviteController', 'ProposalController', 'MakeOfferController', 'CampaignRequestByAffiliateController']
  },
  {
    name: '3. Campaigns, Creatives & Catalog (Banners, Coupons, Products)',
    description: 'Marketing campaigns, promotional banners, coupon voucher codes, product hierarchies, and data feeds.',
    controllers: ['CampaignController', 'BannerController', 'CouponController', 'DataSetController', 'ProductController', 'CommonCategoryController', 'SubChildCategoryController']
  },
  {
    name: '4. Tracking, Attribution & Analytics Engine',
    description: 'Unique tracking referral links, click/impression cookies, embeddable JS tracking pixels, S2S postbacks, untracked sales, and analytics dashboards.',
    controllers: ['AffiliateLinkController', 'LinkGenerateController', 'TrackingManagementController', 'CookiesController', 'TrackCustomerController', 'UntrackSalesController', 'GeneralPurposeTrackingController', 'ScriptController', 'PostbackUrlController', 'AnalyticsController', 'DashboardController']
  },
  {
    name: '5. Commissions, Invoicing & Payout Operations',
    description: 'Commission calculation, multi-tier commission rules, automated monthly cron invoices, transactions, payout routing, bank accounts, and tax computation.',
    controllers: ['CommissionController', 'CommissionsManagementController', 'CommissionCronController', 'TransactionsController', 'BankAccountController', 'NewTaxController']
  },
  {
    name: '6. Billing, Subscriptions & Payment Gateways',
    description: 'Brand subscription plans, Stripe checkout & cards, PayPal subscription plans, Braintree integration, and discount codes.',
    controllers: ['SubscriptionPlansController', 'StripeController', 'PaypalController', 'BraintreeController', 'CardBraintreeController', 'DiscountController', 'DiscountBraintreeController']
  },
  {
    name: '7. Content, Communication & System Administration',
    description: 'Media uploads (images/videos/docs), dynamic email templates, custom SMTP gateways, notifications, CMS pages, FAQs, blogs, reviews, localized countries/languages, and data exporters.',
    controllers: ['CommonController', 'CommonDeletesController', 'EmailTemplateController', 'EmailSentSettingController', 'SmtpController', 'NotificationsController', 'ContentManagementController', 'SettingsController', 'FaqController', 'BlogController', 'ReviewsController', 'LanguagesController', 'CountriesController', 'FeaturesController', 'ExportController', 'FirstpromoterController', 'View']
  }
];

// Helper to determine if endpoint is public
function isPublicAction(controllerName, actionName) {
  if (policies[controllerName]) {
    if (policies[controllerName]['*'] === true) return true;
    if (policies[controllerName][actionName] === true) return true;
  }
  return false;
}

// Generate realistic payloads based on controller and action
function generatePayload(controller, action, method, url) {
  // Upload endpoints -> formdata
  if (url.includes('/upload')) {
    return {
      mode: 'formdata',
      formdata: [
        { key: 'image', type: 'file', description: 'Select image file to upload' },
        { key: 'document', type: 'file', description: 'Select document file to upload' },
        { key: 'video', type: 'file', description: 'Select video file to upload' }
      ]
    };
  }

  // GET or DELETE with no body
  if (method === 'GET' || (method === 'DELETE' && !url.includes('/delete'))) {
    return null;
  }

  // Specific Action Payloads
  // --- PlatformController ---
  if (controller === 'PlatformController') {
    if (action === 'registerBusiness') {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          business_name: 'Acme Brand Media',
          subdomain: 'acme',
          admin_email: 'admin@acme.com',
          admin_name: 'Admin Manager',
          password: 'Password@123',
          currency: 'USD',
          company_phone: '+14155552671'
        }, null, 2)
      };
    }
    if (action === 'createCheckoutSession') {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          tenant_id: '{{tenantId}}',
          plan_id: 'growth',
          success_url: 'https://{{subdomain}}.upfilly.com/dashboard?payment=success',
          cancel_url: 'https://{{subdomain}}.upfilly.com/billing?payment=canceled'
        }, null, 2)
      };
    }
    if (action === 'configureCustomDomain') {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          tenant_id: '{{tenantId}}',
          custom_domain: 'partners.acmemedia.com'
        }, null, 2)
      };
    }
    if (action === 'stripeWebhook') {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_sample',
              customer: 'cus_sample123',
              subscription: 'sub_sample123',
              amount_total: 19900,
              metadata: { tenant_id: '{{tenantId}}' }
            }
          }
        }, null, 2)
      };
    }
  }

  // --- UsersController ---
  if (controller === 'UsersController') {
    if (action === 'userSignin' || action === 'adminSignin') {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          email: 'admin@acme.com',
          password: 'Password@123',
          device_token: 'fcm_sample_device_token'
        }, null, 2)
      };
    }
    if (action === 'register' || action === 'registerBrandWithPlan') {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'partner@example.com',
          password: 'Password@123',
          role: 'affiliate',
          brand_name: 'Jane Partner Network',
          country: 'United States',
          dialCode: '+1',
          mobileNo: '4155551234',
          terms_and_conditions: true
        }, null, 2)
      };
    }
    if (action === 'changePassword') {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          current_password: 'Password@123',
          new_password: 'NewPassword@2026!',
          confirm_password: 'NewPassword@2026!'
        }, null, 2)
      };
    }
    if (action === 'forgotPassword' || action === 'forgotPasswordFrontend') {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          email: 'user@example.com'
        }, null, 2)
      };
    }
    if (action === 'resetPassword') {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          token: 'jwt_reset_token_from_email',
          password: 'NewPassword@2026!',
          confirm_password: 'NewPassword@2026!'
        }, null, 2)
      };
    }
    if (action === 'editProfile' || action === 'updateBasicDetails') {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          firstName: 'Jane',
          lastName: 'Doe',
          brand_name: 'Acme Partner Brand',
          website: 'https://acmebrand.com',
          country: 'United States',
          city: 'San Francisco',
          state: 'California',
          pincode: '94103',
          bio: 'Performance marketing agency'
        }, null, 2)
      };
    }
    if (action === 'userNameCheck') {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          userName: 'janepartner'
        }, null, 2)
      };
    }
    if (action === 'addUser') {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          firstName: 'Alex',
          lastName: 'Smith',
          email: 'alex.staff@acme.com',
          role: 'team',
          password: 'Password@123',
          permissions: ['campaign_view', 'campaign_create', 'affiliate_view']
        }, null, 2)
      };
    }
  }

  // --- CampaignController ---
  if (controller === 'CampaignController') {
    if (action.startsWith('add') || action.startsWith('create')) {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          campaign_name: 'Summer Mega Sale 2026',
          campaign_type: 'percentage',
          commission_percentage: 15,
          cookie_duration: 30,
          landing_page_url: 'https://brandstore.com/summer-sale',
          category_id: 'category_id_sample',
          description: 'Earn 15% commission on all summer product sales.',
          auto_approve_affiliate: true,
          status: 'active'
        }, null, 2)
      };
    }
    if (action.startsWith('edit') || action.startsWith('update')) {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          id: 'campaign_id_sample',
          campaign_name: 'Updated Summer Mega Sale 2026',
          commission_percentage: 20,
          status: 'active'
        }, null, 2)
      };
    }
  }

  // --- BannerController ---
  if (controller === 'BannerController') {
    return {
      mode: 'raw',
      raw: JSON.stringify({
        campaign_id: 'campaign_id_sample',
        banner_name: 'Leaderboard 728x90',
        banner_type: 'image',
        image: 'https://images.upfilly.com/banners/summer_728x90.png',
        width: 728,
        height: 90,
        target_url: 'https://brandstore.com/summer',
        status: 'active'
      }, null, 2)
    };
  }

  // --- CouponController ---
  if (controller === 'CouponController') {
    return {
      mode: 'raw',
      raw: JSON.stringify({
        campaign_id: 'campaign_id_sample',
        coupon_code: 'SAVE20SUMMER',
        discount_type: 'percentage',
        discount_value: 20,
        affiliate_id: 'affiliate_id_sample',
        expiry_date: '2026-12-31',
        status: 'active'
      }, null, 2)
    };
  }

  // --- AffiliateLinkController & LinkGenerateController ---
  if (controller === 'AffiliateLinkController' || controller === 'LinkGenerateController') {
    return {
      mode: 'raw',
      raw: JSON.stringify({
        campaign_id: 'campaign_id_sample',
        affiliate_id: 'affiliate_id_sample',
        target_url: 'https://brandstore.com/products/item1',
        channel: 'instagram'
      }, null, 2)
    };
  }

  // --- Tracking & Cookies ---
  if (controller === 'CookiesController' || controller === 'TrackingManagementController') {
    return {
      mode: 'raw',
      raw: JSON.stringify({
        affiliate_unique_id: 'aff_xyz123',
        campaign_unique_id: 'camp_abc456',
        target_url: 'https://brandstore.com',
        ip: '192.168.1.1',
        user_agent: 'Mozilla/5.0 Chrome/120.0',
        referrer: 'https://instagram.com'
      }, null, 2)
    };
  }

  // --- CommissionController ---
  if (controller === 'CommissionController' || controller === 'CommissionsManagementController') {
    return {
      mode: 'raw',
      raw: JSON.stringify({
        affiliate_id: 'affiliate_id_sample',
        campaign_id: 'campaign_id_sample',
        order_id: 'ORDER-987654',
        sale_amount: 120.50,
        commission_amount: 18.08,
        status: 'approved',
        currency: 'USD'
      }, null, 2)
    };
  }

  // --- SubscriptionPlansController & StripeController ---
  if (controller === 'SubscriptionPlansController' || controller === 'StripeController') {
    if (action.includes('checkout') || action.includes('subscribe')) {
      return {
        mode: 'raw',
        raw: JSON.stringify({
          plan_id: 'plan_id_sample',
          payment_method_id: 'pm_card_visa',
          billing_interval: 'month'
        }, null, 2)
      };
    }
    return {
      mode: 'raw',
      raw: JSON.stringify({
        name: 'Brand Pro Tier',
        price: 99,
        billing_interval: 'month',
        features: { max_affiliates: 1000, tracking_days: 60 }
      }, null, 2)
    };
  }

  // Default Fallback JSON Payload for POST/PUT
  return {
    mode: 'raw',
    raw: JSON.stringify({
      id: 'sample_id',
      status: 'active',
      name: 'Sample Item',
      description: 'Sample description payload'
    }, null, 2)
  };
}

// Generate human-friendly request title
function generateRequestName(method, url, action) {
  // Convert action camelCase to title
  const cleanAction = action
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();

  return `${method} ${url} (${cleanAction})`;
}

// Generate URL breakdown for Postman
function buildPostmanUrl(url, method) {
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  const pathParts = cleanPath.split('/').map(p => p.startsWith(':') ? `{{${p.slice(1)}}}` : p);

  const queryParams = [];
  if (method === 'GET' && !url.includes('/sample/')) {
    queryParams.push(
      { key: 'page', value: '1', description: 'Page number for pagination', disabled: true },
      { key: 'count', value: '10', description: 'Number of items per page', disabled: true },
      { key: 'search', value: '', description: 'Search filter query', disabled: true },
      { key: 'status', value: 'active', description: 'Status filter', disabled: true }
    );
  }

  return {
    raw: `{{baseUrl}}/${cleanPath}`,
    host: ['{{baseUrl}}'],
    path: pathParts,
    query: queryParams
  };
}

// Main generation function
function generateCollection() {
  console.log('Generating Complete Postman Collection for Upfilly API...');

  const collection = {
    info: {
      _postman_id: uuidv4(),
      name: 'Upfilly Multi-Tenant API Platform (Complete Collection)',
      description: 'Complete Postman Collection covering all 316 API endpoints across the Upfilly platform.\n\n### Multi-Tenancy Instructions:\n1. Set `{{baseUrl}}` to your API domain (e.g. `http://localhost:6043` or `https://api.upfilly.com`).\n2. Set `{{subdomain}}` to your tenant subdomain (e.g. `acme`).\n3. After calling `/user/signin` or `/platform/register`, copy the returned JWT token into `{{token}}`.\n4. All tenant-scoped requests automatically include `Host: {{subdomain}}.upfilly.com` to route to that business\'s dedicated database.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    variable: [
      { key: 'baseUrl', value: 'http://localhost:6043', type: 'string', description: 'Root API backend URL' },
      { key: 'subdomain', value: 'acme', type: 'string', description: 'Active tenant business subdomain' },
      { key: 'token', value: '', type: 'string', description: 'JWT Bearer Authorization token' },
      { key: 'tenantId', value: '', type: 'string', description: 'ID of the active business tenant' },
      { key: 'brandId', value: '', type: 'string', description: 'Brand user ID' },
      { key: 'affiliateId', value: '', type: 'string', description: 'Affiliate user ID' },
      { key: 'campaignId', value: '', type: 'string', description: 'Sample campaign ID' }
    ],
    item: []
  };

  // Process all routes
  const parsedRoutes = [];
  for (const [key, target] of Object.entries(routes)) {
    const parts = key.trim().split(/\s+/);
    let method = 'GET';
    let url = key;
    if (parts.length > 1) {
      method = parts[0].toUpperCase();
      url = parts.slice(1).join(' ');
    }

    let controller = '';
    let action = '';
    if (typeof target === 'string') {
      const cp = target.split('.');
      controller = cp[0];
      action = cp[1];
    } else {
      controller = 'View';
      action = 'homepage';
    }

    const realController = controllerAlias[controller] || controller;
    const isPublic = isPublicAction(realController, action);

    parsedRoutes.push({
      method,
      url,
      controller: realController,
      action,
      isPublic
    });
  }

  // Categorize routes into folders
  for (const group of moduleGroups) {
    const groupItems = [];
    const groupRoutes = parsedRoutes.filter(r => group.controllers.includes(r.controller));

    for (const r of groupRoutes) {
      // Build Headers
      const headers = [];

      // Content-Type
      if (r.method === 'POST' || r.method === 'PUT' || r.method === 'PATCH') {
        if (!r.url.includes('/upload')) {
          headers.push({ key: 'Content-Type', value: 'application/json' });
        }
      }

      // Authorization header
      if (!r.isPublic && r.controller !== 'PlatformController') {
        headers.push({
          key: 'Authorization',
          value: 'Bearer {{token}}',
          description: 'JWT Bearer Token obtained from /user/signin'
        });
      }

      // Multi-tenancy Host header (for tenant-scoped operations)
      if (r.controller !== 'PlatformController' && !r.url.startsWith('/platform')) {
        headers.push({
          key: 'Host',
          value: '{{subdomain}}.upfilly.com',
          description: 'Tenant subdomain header routing to dedicated tenant database'
        });
      }

      // Payload
      const body = generatePayload(r.controller, r.action, r.method, r.url);

      // Postman Request Object
      const item = {
        name: generateRequestName(r.method, r.url, r.action),
        request: {
          method: r.method,
          header: headers,
          url: buildPostmanUrl(r.url, r.method),
          description: `**Controller**: \`${r.controller}.${r.action}\`\n**Security**: ${r.isPublic ? 'Public' : 'Protected (Bearer JWT)'}\n**Scope**: ${r.controller === 'PlatformController' ? 'Master Platform Control Plane' : 'Dedicated Tenant Database'}`
        },
        response: []
      };

      if (body) {
        item.request.body = body;
      }

      groupItems.push(item);
    }

    collection.item.push({
      name: group.name,
      description: group.description,
      item: groupItems
    });
  }

  // Write output collection file
  const outputPath = path.join(rootDir, 'Upfilly_API_Collection.postman_collection.json');
  fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

  console.log(`✔ Successfully generated Postman collection!`);
  console.log(`✔ Total Folders: ${collection.item.length}`);
  console.log(`✔ Total Requests: ${parsedRoutes.length}`);
  console.log(`✔ Output file: ${outputPath}`);
}

generateCollection();

