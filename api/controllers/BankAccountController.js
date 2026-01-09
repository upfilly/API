"use strict";

const stripeServices = require("../services/StripeServices");
const { constants } = require("../../config/constants");
const credentials = require("../../config/local.js"); //sails.config.env.production;
const stripe = require("stripe")(credentials.PAYMENT_INFO.SECREATKEY);
const db = sails.getDatastore().manager;
const ObjectId = require("mongodb").ObjectId;
// const pdf = require('html-pdf');
const moment = require("moment");
const Services = require("../services/index");
const excel = require("exceljs");
const pdf = require("html-pdf-phantomjs-included");
const { start } = require("pm2");
const { Transaction } = require("mongodb");
const { getTasks } = require("node-cron");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer")
const response = require("../services/Response");
const emails = require("../Emails/EmailMessageTemplate")


/** common function for create account onboarding link */

const accountDetailLink = async (userId) => {
  try {
    let dataObject;
    const getAccountId = await Account.findOne({
      addedBy: userId,
      isActive: true,
    });
    if (getAccountId) {
      dataObject = { accountId: getAccountId.accountId, userId: userId };
    } else {
      return false;
    }
    const createLink = await stripeServices.create_account_link(dataObject);

    if (createLink) {
      return createLink;
    }
  } catch (error) {
    return false;
  }
};
const ReGenerateAccountDetailLink = async (accountId) => {
  try {
    const createLink = await stripeServices.create_account_link({ accountId });

    if (createLink) {
      return createLink;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
};
module.exports = {
  /** create account link */
  createAccount: async (req, res) => {
    try {
      const { email, businessName, country } = req.body;
      if (!email || !businessName || !country) {
        return res.status(400).json({
          success: false,
          error: {
            code: "400",
            message: constants.user.PAYLOAD_MISSING,
          },
        });
      }

      const dataObject = { email, businessName, country };
      const createBankAccount = await stripeServices.add_bank_account(
        dataObject
      );

      const findAndUpdate = await Account.update({
        addedBy: req.identity.id,
        isActive: true,
      }).set({ isActive: false });
      const saveAccountId = await Account.create({
        status: "active",
        accountId: createBankAccount.id,
        addedBy: req.identity.id,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).fetch();
      if (saveAccountId) {
        const link = await accountDetailLink(req.identity.id);

        return res.status(200).json({
          success: true,
          data: link,
          message: constants.BANK_ACCOUNT.CREATED,
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: "400",
          message: " " + error,
        },
      });
    }
  },
  /** Update Account Details */
  webhook: async (request, response) => {
    try {
      const eventObject = request.body.data.object;
      switch (request.body.type) {
        case "account.updated":
          const findAccount = await Account.findOne({
            accountId: eventObject.id,
          });

          if (findAccount) {
            const updateObject = {
              transfer: eventObject.capabilities.transfers || "",
              account_holder_name:
                eventObject.external_accounts?.data[0]?.account_holder_name ||
                "",
              bank_name:
                eventObject.external_accounts?.data[0]?.bank_name || "",
              country: eventObject.external_accounts?.data[0]?.country || "",
              currency: eventObject.external_accounts?.data[0]?.currency || "",
              accountStatus:
                eventObject.external_accounts?.data[0]?.status || "",
              routingNumber:
                eventObject.external_accounts?.data[0]?.routing_number || "",
              bankAccountNumber:
                eventObject.external_accounts?.data[0]?.last4 || "",
            };

            await Account.updateOne({ accountId: eventObject.id }).set(
              updateObject
            );
          } else {
            console.log("Account not found");
          }
          break;
        case "balance.available":
          console.log("handle balance availiable webhook");
          break;

        default:
          // Log unhandled event types
          console.log(`Unhandled event type ${request.body.type}`);
          break;
      }

      // Send a response to Stripe acknowledging receipt of the webhook
      response.json({ received: true });
    } catch (error) {
      console.log("Error handling webhook:", error);
      return response.status(200).json({
        success: false,
      });
    }
  },
  /*** update active and inactive account */
  regenrateOnBoardingLink: async (req, res) => {
    try {
      const { accountId } = req.body;
      if (!accountId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "400",
            message: constants.onBoarding.PAYLOAD_MISSING,
          },
        });
      }

      const createLink = await ReGenerateAccountDetailLink(accountId);
      return res.status(200).json({
        success: true,
        data: createLink,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: "400",
          message: " " + error,
        },
      });
    }
  },
  updateAccountStatus: async (req, res) => {
    try {
      const { accountId, status, userId } = req.body;

      if (!accountId || !status) {
        return res.status(400).json({
          success: false,
          error: {
            code: "400",
            message: constants.user.PAYLOAD_MISSING,
          },
        });
      }

      if (status === true) {
        const activeAccount = await Account.find({
          userId: userId,
          isActive: true,
        });
        if (activeAccount) {
          await Account.update({ userId: userId }).set({ isActive: false });
        }

        const updateAccountStatus = await Account.updateOne(
          { accountId: accountId, userId: userId },
          { isActive: true }
        );

        if (updateAccountStatus.modifiedCount > 0) {
          return res.status(200).json({
            success: true,
            message: constants.BANK_ACCOUNT.ACCOUNT_STATUS_UPDATED,
          });
        } else {
          return res.status(400).json({
            success: false,
            error: {
              code: "400",
              message: constants.BANK_ACCOUNT.UPDATE_FAILED,
            },
          });
        }
      }

      if (status === false) {
        await Account.update({ userId: userId }).set({ isActive: false });

        const latestAccount = await Account.findOne({ userId: userId }).sort({
          createdAt: -1,
        });

        if (latestAccount) {
          await Account.updateOne({ accountId: latestAccount.accountId }).set({
            isActive: true,
          });
          return res.status(200).json({
            success: true,
            message: constants.BANK_ACCOUNT.LATEST_ACCOUNT_ACTIVATED,
          });
        } else {
          return res.status(404).json({
            success: false,
            error: {
              code: "404",
              message: constants.BANK_ACCOUNT.ACCOUNT_NOT_FOUND,
            },
          });
        }
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: "500",
          message: "Server error: " + error.message,
        },
      });
    }
  },
  /** Used to fetch transfer listing */
  transferListing: async (req, res) => {
    try {
      const { page, count, sortBy, search } = req.body;

      // const sortquery = {}

      // if (sortBy) {
      //     const [field, sortType] = sortBy.split(" ");
      //     sortquery[field || "createdAt"] = sortType === "desc" ? -1 : 1;
      // } else {
      //     sortquery.createdAt = -1;
      // }
      let sortquery = {};
      if (sortBy && typeof sortBy === "string") {
        const [rawField, rawOrder] = sortBy.trim().split(/\s+/);
        const field = rawField || "createdAt";
        const sortType = rawOrder?.toLowerCase() === "asc" ? 1 : -1;
        sortquery[field] = sortType;
      } else {
        sortquery = { updatedAt: -1 };
      }

      const query = {};

      if (search) {
        query.$or = [
          { "paidTo.name": { $regex: search, $options: "i" } },
          { "paidTo.fullName": { $regex: search, $options: "i" } },
          { "paidTo.venue_name": { $regex: search, $options: "i" } },
          { "paidTo.email": { $regex: search, $options: "i" } },
        ];
      }
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "paidTo",
            foreignField: "_id",
            as: "paidToDetails",
          },
        },
        {
          $unwind: {
            path: "$paidToDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            transferredAmount: "$transferredAmount",
            paidTo: "$paidToDetails",
            accountId: "$accountDetails",
            currency: "$currency",
            transferId: "$transferId",
            accountId: "$accountId",
            transferredAt: "$transferredAt",
            status: "$status",
            isDeleted: "$isDeleted",
            createdAt: "$createdAt",
            updatedAt: "$updatedAt",
          },
        },
      ];
      //have to create transfer table
      const total = await Transfer.aggregate([...pipeline]);
      const totalCount = total.length;

      if (page && count) {
        var skipNo = (Number(page) - 1) * Number(count);

        pipeline.push(
          {
            $skip: Number(skipNo),
          },
          {
            $limit: Number(count),
          }
        );
      }

      const result = await Transfer.aggregate([...pipeline]);

      return res.status(200).json({
        success: true,
        data: result,
        total: totalCount,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {},
      });
    }
  },
  /** Used to fetch transfer detail */
  transferDetail: async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "400",
            message: constants.onBoarding.PAYLOAD_MISSING,
          },
        });
      }

      const transferDetail = await Transfer.findOne({ _id: id }).populate(
        "paidTo"
      );
      if (transferDetail) {
        return res.status(200).json({
          success: true,
          data: transferDetail,
          message: constants.BANK_ACCOUNT.DETAIL,
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: "400",
          message: " " + error,
        },
      });
    }
  },
  retriveAccount: async (req, res) => {
    try {
      // const { accountId } = req.body;

      // if (!accountId) {
      //     return res.status(400).json({
      //         success: false,
      //         error: {
      //             code: "400",
      //             message: "Account ID is required"
      //         }
      //     });
      // }

      // Fetch the account details from Stripe
      let userId = req.param("userId");
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "Pass user's ID!",
        });
      }
      let connectedAccount = await Account.findOne({
        addedBy: userId,
        isActive: true,
        isDeleted: false,
      });
      if (!connectedAccount) {
        return res.status(200).json({
          success: true,
          data: null,
          message: "No linked active account found!",
        });
      }
      // const accountDetails = await stripeServices.retrieve_account(connectedAccount.accountId);
      return res.status(200).json({
        success: true,
        data: connectedAccount,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: "400",
          message: "Error retrieving account details: " + error.message,
        },
      });
    }
  },
  deleteAccount: async (req, res) => {
    try {
      let accountId = req.param("accountId");
      if (!accountId) {
        return res.status(400).json({
          success: false,
          message: "Pass account ID!",
        });
      }
      let connectedAccount = await Account.findOne({ id: accountId });
      if (!connectedAccount) {
        return res.status(404).json({
          success: false,
          message: "Account not found!",
        });
      }
      const deletedAccount = await stripe.accounts.del(
        connectedAccount.accountId
      );
      await Account.updateOne({ id: accountId }).set({
        isActive: false,
        isDeleted: true,
      });
      if (deletedAccount.deleted) {
        return res
          .status(200)
          .json({ success: true, message: `Account deleted successfully.` });
      } else {
        return res
          .status(400)
          .json({ success: false, message: `Account could not be deleted.` });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
  transferPayment: async (req, res) => {
    try {
      const { currency,  affiliateLinkIds } = req.body
      let paid_to_emails = new Set([])
      for await (let itm of affiliateLinkIds) {
        const affiliate_data = await AffiliateLink.findOne(itm)
        
        const userDetail = await Users.findOne({ id: affiliate_data.affiliate_id, isDeleted: false });
        if (!paid_to_emails.has(userDetail.email)) {
          paid_to_emails.add(userDetail.email);
          console.log(`${userDetail.email} has been added.`);
        }
        const get_campain_from_affiliations = await BrandAffiliateAssociation.findOne({ brand_id: affiliate_data.brand_id, affiliate_id: affiliate_data.affiliate_id, isActive: true }).populate("campaign_id")
        
        const campaign_details = get_campain_from_affiliations.campaign_id
        let commission_type = get_campain_from_affiliations.campaign_id.commission_type
        let amount = 0
        if (commission_type == "amount") {
          amount = campaign_details.commission
        } else {
          console.log(affiliate_data.price,'=affiliate_data.price')
          console.log(campaign_details.commission,'affiliate_data.commission')

          amount = (affiliate_data.price * campaign_details.commission) / 100
          console.log(amount,'====')
        }
        // let get_user = await Users.findOne({id:get_associate_data})
        const accountDetails = await Account.findOne({
          addedBy: affiliate_data.affiliate_id,
          isDeleted: false,
          isActive: true
        });

        if (!accountDetails) {
          if (userDetail) {
            const emailPayload = {
              fullName: userDetail.fullName,
              email: userDetail.email,
            };

            await emails.reminderToOpenAccount(emailPayload);
          }
          return response.failed(
            null,
            `${userDetail.fullName} hasn't setup account yet.`,
            req,
            res
          );
        }

        // console.log(accountDetails.accountId,'accountDetails.accountId')
        console.log(amount,'amount')
        const payload = {
          accountId: accountDetails.accountId,
          transferredAmount: amount,
          currency: currency || "usd",
          description: `An amount of ${amount / 100} has been transferred from Upfilly to ${userDetail.fullName} on ${moment().format('YYYY-MM-DD HH:mm:ss')}.`,
          paidTo: userDetail.id,
          // scheduleId: transfer._id,
          amount: amount
        };
        invoice_itm_html({
          commission: amount,
        })
        let paid = await stripeServices.transfer_fund(payload);
        if (paid) {
          const invoicesDir = path.join(__dirname, '../../assets', 'invoices');
          if (!fs.existsSync(invoicesDir)) {
            fs.mkdirSync(invoicesDir, { recursive: true });
          }

          const filename = `invoice_${Date.now()}.pdf`;
          const outputPath = path.join(invoicesDir, filename);

          const payload = {
            commission: amount,
          }
          // Generate PDF and wait for it to complete
          await htmlToPdf(invoice_itm_html(payload), outputPath);
          const custom_invoice_url = `invoices/${filename}`

          let data = {
            user_id: req.identity?.id,
            paid_to: get_campain_from_affiliations.affiliate_id ,
            transaction_type: "bank_account",
            transaction_id: "",
            stripe_charge_id: "",
            currency: get_campain_from_affiliations?.currencies,
            amount: amount.toFixed(2),
            transaction_status: "paid",
            special_plan_id: null,
            subscription_id: null,
            stripe_subscription_id: "",
            addedBy: req.identity?.id,
            updatedBy: null,
            paypal_transaction_id: "",
            paypal_transaction_status: "",
            affiliateLinkId: itm,
            custom_invoice_url
          };

          await Transactions.create(data);


          await AffiliateLink.updateOne({ id: itm }, { admin_paid: "paid" })
          let email_payload = {
            fullName: userDetail.fullName,
            email: userDetail.email,
            amount: amount,
          };

          await emails.adminPaid(email_payload);
        }
      }

      const invoicesDir = path.join(__dirname, '../../assets', 'invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const filename = `invoice_${Date.now()}.pdf`;
      const outputPath = path.join(invoicesDir, filename);

      const payload = {
        commission: req.body.amount,
      }
      // Generate PDF and wait for it to complete
      await htmlToPdf(invoice_itm_html(payload), outputPath);
      const custom_invoice_url = `invoices/${filename}`

      // let data = {
      //   user_id: req.identity?.id,
      //   paid_to: null,
      //   paid_to_emails: paid_to_emails,
      //   transaction_type: "bank_account",
      //   transaction_id: "",
      //   stripe_charge_id: "",
      //   currency: "usd",
      //   amount: req.body.amount.toFixed(2),
      //   transaction_status: "paid",
      //   special_plan_id: null,
      //   subscription_id: null,
      //   stripe_subscription_id: "",
      //   addedBy: req.identity?.id,
      //   updatedBy: null,
      //   paypal_transaction_id: "",
      //   paypal_transaction_status: "",
      //   // affiliateLinkId: id,
      //   custom_invoice_url
      // };

      // await Transactions.create(data);

      return response.success(
        null,
        "Payment Transfered successfully",
        req,
        res
      );
    } catch (error) {
      console.error("Error processing transfers:", error);
      return response.failed(null, error, req, res)

    }
  }



};

// Helper function to generate invoice HTML
const invoice_itm_html = (payload) => {
  const { commission } = payload;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #f6f8fb;
      margin: 0;
      padding: 20px;
    }

    .invoice-container {
      max-width: 600px;
      margin: auto;
      background: #ffffff;
      border-radius: 10px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
      padding: 30px;
    }

    .invoice-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #eee;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }

    .invoice-header img {
      height: 40px;
    }

    .invoice-header h2 {
      margin: 0;
      font-size: 22px;
      color: #333;
    }

    .invoice-details {
      margin-bottom: 25px;
    }

    .invoice-details p {
      margin: 4px 0;
      color: #666;
      font-size: 14px;
    }

    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .invoice-table th,
    .invoice-table td {
      padding: 12px 10px;
      font-size: 14px;
    }

    .invoice-table th {
      text-align: left;
      color: #555;
      border-bottom: 1px solid #ddd;
    }

    .invoice-table td {
      text-align: right;
      color: #333;
    }

    .invoice-table tr:not(:last-child) td {
      border-bottom: 1px solid #f0f0f0;
    }

    .total-row td {
      font-weight: bold;
      font-size: 16px;
      border-top: 2px solid #333;
      padding-top: 15px;
    }

    .footer-note {
      text-align: center;
      font-size: 12px;
      color: #888;
      margin-top: 30px;
    }

    @page { margin: 0; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="invoice-header">
      <img src="${credentials.BACK_WEB_URL || 'https://your-domain.com'}/images/logo.png" alt="Upfilly Logo" />
      <h2>Invoice</h2>
    </div>

    <div class="invoice-details">
      <p><strong>Invoice ID:</strong> #INV-${Date.now()}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-CA')}</p>
      <p><strong>Payment Method:</strong> Stripe Transfer</p>
    </div>

    <table class="invoice-table">
      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>
      <tr>
        <td style="text-align:left;">Commission Amount</td>
        <td>$${commission}</td>
      </tr>
     
      
    </table>

    <div class="footer-note">
      Powered by Upfilly • Payments processed securely via Stripe
    </div>
  </div>
</body>
</html>
`;
}

// HTML to PDF function
async function htmlToPdf(html, outputPath) {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.LOCAL ? '/usr/bin/google-chrome' : '/usr/bin/chromium-browser',
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });

    fs.writeFileSync(outputPath, pdfBuffer);
    return outputPath;
  } finally {
    await browser.close();
  }
}
