/**
 * TransactionsController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const response = require("../services/Response");
const constants = require("../../config/constants.js").constants;
const db = sails.getDatastore().manager;
const ObjectId = require("mongodb").ObjectId;
// const pdf = require('html-pdf');
const moment = require("moment");
const credentials = require("../../config/local.js"); //sails.config.env.production;
const Services = require("../services/index");
const excel = require("exceljs");
const pdf = require("html-pdf-phantomjs-included");
const { start } = require("pm2");
const { Transaction } = require("mongodb");
const { getTasks } = require("node-cron");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer")



exports.getAllTransactions = async (req, res) => {
  try {
    let query = {};
    let count = req.param("count") || 10;
    let page = req.param("page") || 1;
    let sortBy = req.param("sortBy");
    let {
      subscription_plan_id,
      time_duration,
      role,
      isDeleted,
      export_to_xls,
      transaction_type,
      paid_to,
      user_id,
      search,
      transaction_status,
    } = req.query;

    if (search) {
      query.$or = [
        { subscription_plan_name: { $regex: search, $options: "i" } },
        { user_id_name: { $regex: search, $options: "i" } },
        { paid_to_name: { $regex: search, $options: "i" } },
      ];
    }
    let skipNo = (page - 1) * count;

    if (user_id) {
      query.user_id = new ObjectId(user_id);
    }

    if (paid_to) {
      query.paid_to = new ObjectId(paid_to);
    }

    if (subscription_plan_id) {
      query.subscription_plan_id = new ObjectId(subscription_plan_id);
    }

    if (transaction_type) {
      query.transaction_type = transaction_type;
    }
    if (transaction_status) {
      query.transaction_status = transaction_status;
    }

    if (role) {
      query.role = role;
    }

    if (time_duration) {
      switch (time_duration) {
        case "today":
          var today = new Date();
          today.setHours(0, 0, 0, 0);
          query.createdAt = {
            $gte: today.toISOString(),
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          };
          break;

        case "tomorrow":
          let tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          query.createdAt = {
            $gte: tomorrow.toISOString(),
            $lt: new Date(
              tomorrow.getTime() + 24 * 60 * 60 * 1000
            ).toISOString(),
          };
          break;

        case "this_weekend":
          var today = new Date();
          var saturday = new Date(today);
          saturday.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7));
          saturday.setHours(0, 0, 0, 0);
          var sunday = new Date(saturday);
          sunday.setDate(saturday.getDate() + 1);
          sunday.setHours(0, 0, 0, 0);

          query.createdAt = {
            $gte: saturday.toISOString(),
            $lt: new Date(sunday.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          };
          break;

        case "this_week":
          today = new Date();
          var startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          var endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 7);
          endOfWeek.setHours(0, 0, 0, 0);

          query.createdAt = {
            $gte: startOfWeek.toISOString(),
            $lt: endOfWeek.toISOString(),
          };
          break;

        case "next_week":
          var today = new Date();
          var startOfNextWeek = new Date(today);
          startOfNextWeek.setDate(
            today.getDate() + ((7 - today.getDay() + 1) % 7)
          );
          startOfNextWeek.setHours(0, 0, 0, 0);
          var endOfNextWeek = new Date(startOfNextWeek);
          endOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
          endOfNextWeek.setHours(0, 0, 0, 0);

          query.createdAt = {
            $gte: startOfNextWeek.toISOString(),
            $lt: endOfNextWeek.toISOString(),
          };
          break;

        case "this_month":
          var today = new Date();
          var startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          var endOfMonth = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0
          );
          query.createdAt = {
            $gte: startOfMonth.toISOString(),
            $lt: endOfMonth.toISOString(),
          };
          break;

        case "next_month":
          var today = new Date();
          var nextMonth = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            1
          );
          var startOfNextMonth = new Date(nextMonth);
          var endOfNextMonth = new Date(
            nextMonth.getFullYear(),
            nextMonth.getMonth() + 1,
            0
          );
          query.createdAt = {
            $gte: startOfNextMonth.toISOString(),
            $lt: endOfNextMonth.toISOString(),
          };
          break;

        default:
      }
    }

    // let sortquery = {};
    // if (sortBy) {
    //     let typeArr = [];
    //     typeArr = sortBy.split(" ");
    //     let sortType = typeArr[1];
    //     let field = typeArr[0];
    //     sortquery[field ? field : 'createdAt'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
    // } else {
    //     sortquery = { updatedAt: -1 }
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

    if (isDeleted) {
      if (isDeleted === "true") {
        isDeleted = true;
      } else {
        isDeleted = false;
      }
      query.isDeleted = isDeleted;
    } else {
      query.isDeleted = false;
    }

    let totalresult = await db
      .collection("transactions")
      .aggregate([
        {
          $lookup: {
            from: "subscriptionplans",
            localField: "subscription_plan_id",
            foreignField: "_id",
            as: "subscription_plans_details",
          },
        },
        {
          $unwind: {
            path: "$subscription_plans_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "subscriptionplans",
            localField: "special_plan_id",
            foreignField: "_id",
            as: "special_plans_details",
          },
        },
        {
          $unwind: {
            path: "$special_plans_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user_id_details",
          },
        },
        {
          $unwind: {
            path: "$user_id_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "paid_to",
            foreignField: "_id",
            as: "paid_to_details",
          },
        },
        {
          $unwind: {
            path: "$paid_to_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            id: "$_id",
            user_id: "$user_id",
            paid_to: "$paid_to",
            transaction_type: "$transaction_type",
            subscription_plan_id: "$subscription_plan_id",
            special_plan_id: "$special_plan_id",
            subscription_id: "$subscription_plan_id",
            transaction_id: "$transaction_id",
            stripe_charge_id: "$stripe_charge_id",
            currency: "$currency",
            amount: "$amount",
            stripe_subscription_id: "$stripe_subscription_id",
            transaction_status: "$transaction_status",
            addedBy: "$addedBy",
            updatedBy: "$updatedBy",
            createdAt: "$createdAt",
            updatedAt: "$updatedAt",
            subscription_plan_name: "$subscription_plans_details.name",
            special_plan_name: "$special_plans_details.name",
            user_id_name: "$user_id_details.fullName",
            role: "$user_id_details.role",
            paid_to_name: "$paid_to_details.fullName",
            isDeleted: {
              $cond: [
                { $ifNull: ["$trash_details", false] },
                "$trash_details.isDeleted",
                false,
              ],
            },
            invoice_url: "$invoice_url",
            affiliateLinkId: "$affiliateLinkId",
            custom_invoice_url: "$custom_invoice_url",
            paid_to_emails: "$paid_to_emails",
          },
        },
        {
          $match: query,
        },
        {
          $sort: sortquery,
        },
      ])
      .toArray();

    let result = await db
      .collection("transactions")
      .aggregate([
        {
          $lookup: {
            from: "subscriptionplans",
            localField: "subscription_plan_id",
            foreignField: "_id",
            as: "subscription_plans_details",
          },
        },
        {
          $unwind: {
            path: "$subscription_plans_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "subscriptionplans",
            localField: "special_plan_id",
            foreignField: "_id",
            as: "special_plans_details",
          },
        },
        {
          $unwind: {
            path: "$special_plans_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user_id_details",
          },
        },
        {
          $unwind: {
            path: "$user_id_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "paid_to",
            foreignField: "_id",
            as: "paid_to_details",
          },
        },
        {
          $unwind: {
            path: "$paid_to_details",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            id: "$_id",
            user_id: "$user_id",
            paid_to: "$paid_to",
            transaction_type: "$transaction_type",
            subscription_plan_id: "$subscription_plan_id",
            subscription_id: "$subscription_plan_id",
            transaction_id: "$transaction_id",
            stripe_charge_id: "$stripe_charge_id",
            currency: "$currency",
            amount: "$amount",
            stripe_subscription_id: "$stripe_subscription_id",
            transaction_status: "$transaction_status",
            addedBy: "$addedBy",
            updatedBy: "$updatedBy",
            createdAt: "$createdAt",
            updatedAt: "$updatedAt",
            subscription_plan_name: "$subscription_plans_details.name",
            special_plan_name: "$special_plans_details.name",
            user_id_name: "$user_id_details.fullName",
            role: "$user_id_details.role",
            paid_to_name: "$paid_to_details.fullName",
            isDeleted: {
              $cond: [
                { $ifNull: ["$trash_details", false] },
                "$trash_details.isDeleted",
                false,
              ],
            },
            invoice_url: "$invoice_url",
            affiliateLinkId: "$affiliateLinkId",
            custom_invoice_url: "$custom_invoice_url",
            paid_to_emails: "$paid_to_emails",
          },
        },
        {
          $match: query,
        },
        {
          $sort: sortquery,
        },
        {
          $skip: Number(skipNo),
        },
        {
          $limit: Number(count),
        },
      ])
      .toArray();

    if (export_to_xls == "yes") {
      if (totalresult && totalresult.length > 0) {
        let workbook = new excel.Workbook();
        let worksheet = workbook.addWorksheet("Transactions");
        worksheet.columns = [
          { header: "S.No", key: "serial_number", width: 10 },
          { header: "Client Name", key: "user_id_name", width: 30 },
          {
            header: "Subscription Plan",
            key: "subscription_plan_name",
            width: 20,
          },
          { header: "Amount", key: "amount", width: 10 },
          { header: "Transaction ID", key: "transaction_id", width: 25 },
          {
            header: "Transaction Status",
            key: "transaction_status",
            width: 20,
          },
          { header: "Created At", key: "createdAt", width: 15 },
        ];
        let counter = 0;
        for await (let values of totalresult) {
          id = counter;
          if (counter) {
            values.serial_number = `${1 + counter}`;
          } else {
            values.serial_number = `${1}`;
          }

          if (values.amount) {
            values.amount = `$${values.amount}`;
          }
          worksheet.addRow(values);
          counter++;
        }

        try {
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + "transactions.xlsx"
          );

          return workbook.xlsx.write(res).then(function () {
            res.status(200).end();
          });
        } catch (err) {
          return response.failed(null, `${err}`, req, res);
        }
      } else {
        return response.failed(null, `No data found to export`, req, res);
      }
    } else {
      let resData = {
        total: totalresult ? totalresult.length : 0,
        data: result ? result : [],
      };
      if (!req.param("page") && !req.param("count")) {
        resData.data = totalresult ? totalresult : [];
      }

      return response.success(
        resData,
        constants.TRANSACTION.FETCHED_ALL,
        req,
        res
      );
    }
  } catch (err) {
    return response.failed(null, `${err}`, req, res);
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    let { id } = req.query;
    if (!id) {
      throw constants.TRANSACTION.ID_REQUIRED;
    }

    let get_transaction = await Transactions.findOne({ id: id })
      .populate("subscription_plan_id")
      .populate("special_plan_id")
      .populate("paid_to")
      .populate("user_id");
    if (get_transaction) {
      return response.success(
        get_transaction,
        constants.TRANSACTION.FETCHED,
        req,
        res
      );
    }
    throw constants.TRANSACTION.INVALID_ID;
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

exports.downloadInvoice = async (req, res) => {
  try {
    if (!req.body.id) {
      throw constants.TRANSACTION.ID_REQUIRED;
    }

    let get_transactions = await Transactions.findOne({ id: req.body.id });
    let date = moment(get_transactions.createdAt).format("DD/MM/YYYY");
    let user_detail = await Users.findOne({ id: get_transactions.user_id });
    let get_subscriptions = await Subscriptions.findOne({
      id: get_transactions.subscription_id,
    });
    let options = {
      localUrlAccess: true,
      // orientation : "portrait",
      header: {
        height: "10mm",
      },
      width: "210mm",
      height: "297mm",
      childProcessOptions: {
        env: {
          OPENSSL_CONF: "/dev/null",
        },
      },
    };

    // src=  "file:////var/www/html/api/api_stask/assets/images/logo.png" // paste this line for image src when going on live
    src =
      "file:////home/jc/Downloads/Projects/api_culture-reach/assets/images/logo.png"; // working on local
    src =
      "file:////root/development/culture-reach/api_culture-reach/assets/images/logo.png"; // development server path
    html = `
        <body style="font-family: Open Sans, sans-serif;">
            <div class="layout" style="margin: 0px auto;max-width: 680px; border-top: solid 10px black; border-radius: 3px;">
                <div class="main"style="box-shadow: 0 6px 18px rgb(0 0 0 / 6%);padding: 0 40px;padding-bottom:1rem;">
                    <div style="display: -webkit-box; display: flex; -webkit-box-pack: center;">
                
                    <img style="max-width: 160px;" src="${src}">
                   
                    </div>
                    <div class="text"style=" border: 1px solid rgb(255 255 255); font-weight: normal; width: 100px; margin: 0px auto; margin-bottom: 2rem;margin-top: 0.5rem;">
                    </div>
                    <h1 style="font-size: 16px;margin-top:1rem;color: #09486b;">Invoice Detail</h1>
                    <table style=" border-collapse: collapse; width: 100%;">
                        <tr style="border: 1px solid rgba(237, 237, 237, 1);" >
                            <td style="color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64); padding: 8px; width:25%;font-size: 12px;">Invoice</td>
                            <td style="color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64);padding: 8px;  width: 75%;font-size: 12px;">#${get_transactions.transactions_number
        ? get_transactions.transactions_number
        : ""
      }</td>
                        </tr>
                        <tr style="border: 1px solid rgba(237, 237, 237, 1);" >
                            <td style="color:#444647 !important;  background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64); padding: 8px; width:25%;font-size: 12px;">Invoice Date</td>
                            <td style="color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64);padding: 8px;  width: 75%;font-size: 12px;">${date ? date : ""
      }</td>
                        </tr>
                    </table>
                    <h1 style="font-size: 16px;margin-top:1rem;color: #09486b;">Customer Detail</h1>
                    <table style=" border-collapse: collapse; width: 100%;">
                        <tr style="border: 1px solid rgba(237, 237, 237, 1);" >
                            <td style="color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64); padding: 8px; width:25%;font-size: 12px;"> Name</td>
                            <td style="color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64);padding: 8px;  width: 75%;font-size: 12px;">${user_detail.fullName
        ? Services.Utils.title_case(
          user_detail.fullName
        )
        : ""
      }</td>
                        </tr>
                        <tr style="border: 1px solid rgba(237, 237, 237, 1);" >
                            <td style="color:#444647 !important;  background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64); padding: 8px; width:25%;font-size: 12px;">Email</td>
                            <td style="color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64);padding: 8px;  width: 75%;font-size: 12px;">${user_detail.email ? user_detail.email : ""
      }</td>
                        </tr>
                        <tr style="border: 1px solid rgba(237, 237, 237, 1);" >
                            <td style="color:#444647 !important;  background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64); padding: 8px; width:25%;font-size: 12px;">Phone</td>
                            <td style="color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64);padding: 8px;  width: 75%;font-size: 12px;">${user_detail
        ? `${user_detail.dialCode
          ? user_detail.dialCode
          : ""
        } ${user_detail.mobileNo
          ? user_detail.mobileNo
          : ""
        }`
        : ""
      }</td>
                        </tr>
                        <tr style="border: 1px solid rgba(237, 237, 237, 1);" >
                            <td style="color:#444647 !important;  background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64); padding: 8px; width:25%;font-size: 12px;">Address</td>
                            <td style="color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64);padding: 8px;  width: 75%;font-size: 12px;">${user_detail
        ? Services.Utils.title_case(user_detail.address)
        : ""
      }</td>
                        </tr>
                    </table>
                    <table style=" border-collapse: collapse; margin-top:1rem; width: 100%;">
                        <tr style="border: 1px solid rgba(237, 237, 237, 1);" >
                            <td style="font-weight: 600;width: 25% !important; color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64); padding: 8px; width:25%;font-size: 12px;">Plan Name</td>
                            <td style="font-weight: 600;width:30% !important; color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64);padding: 8px;  width: 75%;font-size: 12px;">Amount</td>
                            <td style="font-weight: 600;width:25% !important; color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64);padding: 8px;  width: 75%;font-size: 12px;"> Total Amount</td>
                        </tr>
                        <tr style="border: 1px solid rgba(237, 237, 237, 1);" >
                            <td style="width: 25% !important; color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64); padding: 8px; width:25%;font-size: 12px;">${get_subscriptions.name
        ? Services.Utils.title_case(
          get_subscriptions.name
        )
        : ""
      }</td>
                            <td style="width:30% !important; color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64);padding: 8px;  width: 75%;font-size: 12px;">$${get_transactions ? get_transactions.amount : 0
      }</td>
                            <td style="width:25% !important; color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64);padding: 8px;  width: 75%;font-size: 12px;">$${get_transactions.amount
        ? get_transactions.amount.toFixed(2)
        : 0
      }</td>
                        </tr>
                       <!--- <tr style="border: 1px solid rgba(237, 237, 237, 1);" >
                            <td style="height: 14px;width: 25% !important; color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64); padding: 8px; width:25%;font-size: 12px;"> </td>
                            <td style="height: 14px;width:30% !important; color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64);padding: 8px;  width: 75%;font-size: 12px;"></td>
                            <td style="height: 14px;width:25% !important; color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64);padding: 8px;  width: 75%;font-size: 12px;"></td>
                        </tr> ---!>
                        <tr style="border: 1px solid rgba(237, 237, 237, 1);" >
                            <td style="font-weight: 600;width: 25% !important; color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64); padding: 8px; width:25%;font-size: 12px;"> Grand Amount</td>
                            <td style="font-weight: 600;width:30% !important; color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64);padding: 8px;  width: 75%;font-size: 12px;"></td>
                            <td style="font-weight: 600;width:25% !important; color:#444647 !important; background:#f5f1f1;; border: 1px solid rgba(237, 237, 237, 1);color: rgba(0, 0, 0, 0.64);padding: 8px;  width: 75%;font-size: 12px;">$${get_transactions
        ? get_transactions.amount.toFixed(2)
        : 0
      }</td>
                        </tr>
                    </table>
                </div>
            </div>
        </body>        `;
    pdf.create(html, options).toBuffer(function (err, buffer) {
      res.set("Content-Type", "application/octet-stream");
      res.set("Content-Disposition", `attachment; filename=Invoice.pdf`);
      res.set("Content-Length", buffer.length);
      res.send(buffer);
    });
  } catch (error) {
    // console.log(error, '==========error')
    return response.failed(null, `${error}`, req, res);
  }
};

exports.getAllTransactionsContracts = async (req, res) => {
  try {
    let query = {};
    let count = req.param("count") || 10;
    let page = req.param("page") || 1;
    let { search, status, sortBy, user_id, paid_to, transaction_type } =
      req.query;
    let skipNo = (Number(page) - 1) * Number(count);
    let group_by = "$_id";
    if (search) {
      search = Services.Utils.remove_special_char_exept_underscores(search);
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { influencer_name: { $regex: search, $options: "i" } },
        { brand_name: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    // let sortquery = {};
    // if (sortBy) {
    //     let typeArr = [];
    //     typeArr = sortBy.split(" ");
    //     let sortType = typeArr[1];
    //     let field = typeArr[0];
    //     sortquery[field ? field : 'createdAt'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
    // } else {
    //     sortquery = { createdAt: -1 }
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

    if (user_id) {
      query.user_id = new ObjectId(user_id);
    }

    if (paid_to) {
      query.paid_to = new ObjectId(paid_to);
    }

    if (transaction_type) {
      query.transaction_type = transaction_type;
    }

    // Pipeline Stages
    let pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_id_details",
        },
      },
      {
        $unwind: {
          path: "$user_id_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "paid_to",
          foreignField: "_id",
          as: "paid_to_details",
        },
      },
      {
        $unwind: {
          path: "$paid_to_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "contracts",
          localField: "contract_id",
          foreignField: "_id",
          as: "contract_id_details",
        },
      },
      {
        $unwind: {
          path: "$contract_id_details",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    let projection = {
      $project: {
        _id: "$_id",
        id: "$_id",
        user_id: "$user_id",
        paid_to: "$paid_to",
        transaction_type: "$transaction_type",
        user_id_name: "$user_id_details.fullName",
        paid_to_name: "$paid_to_details.fullName",
        contract_id: "$contract_id",
        contract_name: "$contract_id_details.name",
        createdAt: "$createdAt",
      },
    };

    pipeline.push(projection);
    pipeline.push({
      $match: query,
    });
    pipeline.push({
      $sort: sortquery,
    });

    let group_stage = {
      $group: {
        _id: group_by,
        contract_id: { $first: "$contract_id" },
        contract_name: { $first: "$contract_name" },
      },
    };
    pipeline.push(group_stage);

    // Pipeline Stages
    let totalresult = db
      .collection("transactions")
      .aggregate(pipeline)
      .toArray();
    pipeline.push({
      $skip: Number(skipNo),
    });
    pipeline.push({
      $limit: Number(count),
    });
    let result = await db
      .collection("transactions")
      .aggregate(pipeline)
      .toArray();
    let resData = {
      total_count: totalresult ? totalresult.length : 0,
      data: result ? result : [],
    };
    if (!req.param("page") && !req.param("count")) {
      resData.data = totalresult ? totalresult : [];
    }
    return response.success(
      resData,
      constants.CONTRACT.USERS_FETCHED,
      req,
      res
    );
  } catch (err) {
    return response.failed(null, `${err}`, req, res);
  }
};

exports.getTransactionsGraphData = async (req, res) => {
  try {
    let query = {};
    let { user_id, paid_to, year, month, transaction_type } = req.query;
    if (user_id) {
      query.user_id = new ObjectId(user_id);
    }
    if (paid_to) {
      query.paid_to = new ObjectId(paid_to);
    }
    if (year) {
      query.year = Number(year);
    }
    if (month) {
      query.month = Number(month);
    }
    if (transaction_type) {
      query.transaction_type = transaction_type;
    }

    // Pipeline Stages
    let pipeline = [];
    let projection = {
      $project: {
        id: "$_id",
        user_id: "$user_id",
        paid_to: "$paid_to",
        transaction_type: "$transaction_type",
        subscription_plan_id: "$subscription_plan_id",
        subscription_id: "$subscription_plan_id",
        amount: "$amount",
        transaction_status: "$transaction_status",
        addedBy: "$addedBy",
        isDeleted: "isDeleted",
        contract_id: "$contract_id",
        createdAt: "$createdAt",
        updatedAt: "$updatedAt",
        updatedBy: "$updatedBy",
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      },
    };

    pipeline.push(projection);
    pipeline.push({
      $match: query,
    });
    let facet = {
      $facet: {
        Hourly: [
          {
            $group: {
              _id: {
                $hour: "$createdAt",
              },
              total: {
                $sum: "$amount",
              },
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
          {
            $group: {
              _id: null,
              result: {
                $push: {
                  hour: "$_id",
                  total: "$total",
                },
              },
            },
          },
        ],
        Weekly: [
          {
            $group: {
              _id: {
                $week: "$createdAt",
              },
              total: {
                $sum: "$amount",
              },
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
          {
            $group: {
              _id: null,
              result: {
                $push: {
                  week: "$_id",
                  total: "$total",
                },
              },
            },
          },
        ],
        Monthly: [
          {
            $group: {
              _id: {
                $month: "$createdAt",
              },
              total: {
                $sum: "$amount",
              },
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
          {
            $group: {
              _id: null,
              result: {
                $push: {
                  month: "$_id",
                  total: "$total",
                },
              },
            },
          },
        ],
        Yearly: [
          {
            $group: {
              _id: {
                $year: "$createdAt",
              },
              total: {
                $sum: "$amount",
              },
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
          {
            $group: {
              _id: null,
              result: {
                $push: {
                  year: "$_id",
                  total: "$total",
                },
              },
            },
          },
        ],
        Quarterly: [
          {
            $addFields: {
              quarter: { $ceil: { $divide: [{ $month: "$createdAt" }, 3] } },
            },
          },
          {
            $group: {
              _id: "$quarter",
              total: {
                $sum: "$amount",
              },
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
          {
            $group: {
              _id: null,
              result: {
                $push: {
                  quarter: "$_id",
                  total: "$total",
                },
              },
            },
          },
        ],
      },
    };
    pipeline.push(facet);

    let addFields1 = {
      $addFields: {
        Hourly: {
          $arrayElemAt: ["$Hourly", 0],
        },
        Weekly: {
          $arrayElemAt: ["$Weekly", 0],
        },
        Monthly: {
          $arrayElemAt: ["$Monthly", 0],
        },
        Yearly: {
          $arrayElemAt: ["$Yearly", 0],
        },
        Quarterly: {
          $arrayElemAt: ["$Quarterly", 0],
        },
      },
    };
    pipeline.push(addFields1);

    let addFields2 = {
      $addFields: {
        Hourly: "$Hourly.result",
        Weekly: "$Weekly.result",
        Monthly: "$Monthly.result",
        Yearly: "$Yearly.result",
        Quarterly: "$Quarterly.result",
      },
    };
    pipeline.push(addFields2);

    // Pipeline Stages
    db.collection("transactions")
      .aggregate(pipeline)
      .toArray((err, result) => {
        if (err) throw err;
        let resData = {
          data: result ? result : [],
        };
        resData.isDataAvailable =
          Number(Object.values(result[0]).length) > 0 ? true : false;
        return response.success(
          resData,
          constants.CONTRACT.GRAPH_DATA_FETCHED,
          req,
          res
        );
      });
  } catch (error) {
    return response.failed(null, `${error}`, req, res);
  }
};

// exports.transactionGraph= async function (req, res) {
//     try {
//       const { startDate, endDate, filter } = req.query;

//       const moment = require('moment');
//       let start, end;
//       let filterType = filter || "this_month";

//       if (startDate && endDate) {
//         start = moment(startDate, "YYYY-MM-DD").startOf("day").toDate();
//         end = moment(endDate, "YYYY-MM-DD").endOf("day").toDate();
//       } else {
//         switch (filterType) {
//           case "this_week":
//             start = moment().startOf("week").toDate();
//             end = moment().endOf("week").toDate();
//             break;
//           case "last_week":
//             start = moment().subtract(1, "week").startOf("week").toDate();
//             end = moment().subtract(1, "week").endOf("week").toDate();
//             break;
//           case "this_month":
//             start = moment().startOf("month").toDate();
//             end = moment().endOf("month").toDate();
//             break;
//           case "last_month":
//             start = moment().subtract(1, "month").startOf("month").toDate();
//             end = moment().subtract(1, "month").endOf("month").toDate();
//             break;
//           case "this_year":
//             start = moment().startOf("year").toDate();
//             end = moment().endOf("year").toDate();
//             break;
//           case "last_year":
//             start = moment().subtract(1, "year").startOf("year").toDate();
//             end = moment().subtract(1, "year").endOf("year").toDate();
//             break;
//           default:
//             start = moment().startOf("month").toDate();
//             end = moment().endOf("month").toDate();
//         }
//       }
//       const result = await db.collection("transactions").aggregate([
//         {
//           $group: {
//             _id: "$transaction_type",
//             totalAmount: { $sum: "$amount" },
//             count: { $sum: 1 },
//           },
//         },
//         {
//           $project: {
//             transaction_type: "$_id",
//             totalAmount: 1,
//             count: 1,
//             _id: 0,
//           },
//         },
//         {
//           $sort: { totalAmount: -1 },
//         },
//       ]).toArray();

//       return res.status(200).json({ success: true, data: result });

//     } catch (err) {
//       sails.log.error("Transaction graph error:", err);
//       return res.serverError({ success: false, message: err.message });
//     }
//   }
exports.transactionGraph = async function (req, res) {
  try {
    const { startDate, endDate, filter, brand_id, affiliate_id } = req.query;

    const moment = require("moment");
    let start, end;
    let filterType = filter || "this_month";

    if (startDate && endDate) {
      start = moment(startDate, "YYYY-MM-DD").startOf("day").toDate();
      end = moment(endDate, "YYYY-MM-DD").endOf("day").toDate();
    } else {
      switch (filterType) {
        case "this_week":
          start = moment().startOf("week").toDate();
          end = moment().endOf("week").toDate();
          break;
        case "last_week":
          start = moment().subtract(1, "week").startOf("week").toDate();
          end = moment().subtract(1, "week").endOf("week").toDate();
          break;
        case "this_month":
          start = moment().startOf("month").toDate();
          end = moment().endOf("month").toDate();
          break;
        case "last_month":
          start = moment().subtract(1, "month").startOf("month").toDate();
          end = moment().subtract(1, "month").endOf("month").toDate();
          break;
        case "this_year":
          start = moment().startOf("year").toDate();
          end = moment().endOf("year").toDate();
          break;
        case "last_year":
          start = moment().subtract(1, "year").startOf("year").toDate();
          end = moment().subtract(1, "year").endOf("year").toDate();
          break;
        default:
          start = moment().startOf("month").toDate();
          end = moment().endOf("month").toDate();
      }
    }

    const matchConditions = {
      createdAt: { $gte: start, $lte: end },
    };

    if (brand_id || affiliate_id) {
      matchConditions.$or = [];

      if (brand_id) {
        matchConditions.$or.push({ user_id: new ObjectId(brand_id) });
      }

      if (affiliate_id) {
        matchConditions.$or.push({ user_id: affiliate_id });
      }
    }
    console.log(matchConditions, "matchConditions");
    const result = await db
      .collection("transactions")
      .aggregate([
        {
          $match: matchConditions,
        },
        {
          $group: {
            _id: "$transaction_type",
            totalAmount: { $sum: "$amount" },
            firstCreatedAt: { $first: "$createdAt" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            transaction_type: "$_id",
            totalAmount: 1,
            count: 1,
            createdAt: "$firstCreatedAt",
            _id: 0,
          },
        },
        {
          $sort: { totalAmount: -1 },
        },
      ])
      .toArray();

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    sails.log.error("Transaction graph error:", err);
    return res.serverError({ success: false, message: err.message });
  }
};

// exports.monthlyPendingTransactions = async function (req, res) {
//   try {
//     const date = new Date();
//     const startDate = new Date(
//       Date.UTC(date.getFullYear(), date.getMonth(), 1)
//     );
//     const endDate = new Date(
//       Date.UTC(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
//     );
//     // console.log("Start date  = ", startDate, "End Date = ", endDate);
//     let monthlyData = {}; // Object containing response

//     const getTransactions = await Transactions.find({
//       createdAt: { ">=": startDate, "<=": endDate },
//       user_id: req.identity?.id,
//       transaction_type: "pay_commission",
//       transaction_status: "pending",
//     });
//     if (!getTransactions) {
//       return res.status(400).json({
//         success: false,
//         message: "No pending transactions found within the month",
//       });
//     }

//     monthlyData.totalPendingTransactions = getTransactions.length;

//     let totalAmount = 0,
//       arr = [];
//     for (let obj of getTransactions) {
//       arr.push(obj.id);
//       totalAmount += obj.amount;
//     }

//     totalPending_PaidCount = await AffiliateLink.find({
//       isDeleted: false,
//       admin_paid: "pending",
//     });

//     let totalAdminPendingPrice = 0;

//     for (let item of totalPending_PaidCount) {
//       totalAdminPendingPrice += item.price || 0;
//     }

//     // Find user acitve subscription plan
//     const user_active_subscription = await Subscriptions.findOne({
//       user_id: req.identity?.id,
//       status: "active",
//     }).populate("subscription_plan_id");
//     let commission_override = 0;
//     if (user_active_subscription) {
//       commission_override =
//         user_active_subscription?.subscription_plan_id?.commission_override;
//     } else {
//       return response.failed(null, "You don't have any active plan", req, res);
//     }

//     const commission_override_amount =
//       (commission_override / 100) * totalAmount;
//     totalAmount += +commission_override_amount;
//     const stripe_fee = calculateStripeFee(totalAmount);

//     monthlyData.admin_pending_total_price = totalAdminPendingPrice;
//     monthlyData.admin_paid_count = totalPending_PaidCount.length;
//     monthlyData.totalPayableAmount = totalAmount + stripe_fee;
//     monthlyData.transaction_ids = arr;

//     return res.status(200).json({ success: true, data: monthlyData });
//   } catch (err) {
//     sails.log.error("Payable Monthly Pending Transactions error:", err);
//     return res.serverError({ success: false, message: err.message });
//   }
// };

exports.monthlyPendingTransactions = async function (req, res) {
  try {
    const date = new Date();
    const startDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
    const endDate = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999));
    // console.log("Start date  = ", startDate, "End Date = ", endDate);
    let monthlyData = {}; // Object containing response

    const getTransactions = await Transactions.find({ createdAt: { '>=': startDate, '<=': endDate }, user_id: req.identity?.id, transaction_type: "pay_commission", transaction_status: "pending" });
    if (!getTransactions) {
      return res.status(400).json({ success: false, message: "No pending transactions found within the month" });
    }
    // console.log("getTransactions",getTransactions)

    monthlyData.totalPendingTransactions = getTransactions.length;

    let totalAmount = 0;
    let first_total = 0;
     arr = [];
    for (let obj of getTransactions) {
      arr.push(obj.id);
      totalAmount += obj.amount;
      first_total += obj.amount;
    }

     // Find user acitve subscription plan
    const user_active_subscription = await Subscriptions.findOne({
      user_id: req.identity?.id,
      status: "active",
    }).populate("subscription_plan_id");
    // console.log("user_active_subscription",user_active_subscription)
    let commission_override = 0;
    if (user_active_subscription) {
      commission_override =
        user_active_subscription?.subscription_plan_id?.commission_override;
        console.log("commission_override",commission_override)
    } else {
      return response.failed(null, "You don't have any active plan", req, res);
    }
console.log("totalAmount",totalAmount)
    const commission_override_amount =
      (commission_override / 100) * totalAmount;
    totalAmount += +commission_override_amount;
    const stripe_fee = calculateStripeFee(totalAmount);
    console.log("stripe_fee",stripe_fee)
console.log("totalAmount",totalAmount)

    monthlyData.totalPayableAmount = totalAmount + stripe_fee;
    monthlyData.ids = arr;
    monthlyData.affiliate_commission = first_total;


    return res.status(200).json({ success: true, data: monthlyData });
  }
  catch (err) {
    sails.log.error("Payable Monthly Pending Transactions error:", err);
    return res.serverError({ success: false, message: err.message });
  }
}
exports.monthlyPendingTransactionsAdmin = async function (req, res) {
  try {
    const date = new Date();
    const startDate = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), 1)
    );
    const endDate = new Date(
      Date.UTC(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
    );
    // console.log("Start date  = ", startDate, "End Date = ", endDate);
    let monthlyData = {}; // Object containing response

    const getTransactions = await Transactions.find({
      createdAt: { ">=": startDate, "<=": endDate },
      // user_id: req.identity?.id,
      transaction_type: "bank_account",
      transaction_status: "pending",
    });
    if (!getTransactions) {
      return res.status(400).json({
        success: false,
        message: "No pending transactions found within the month",
      });
    }

    monthlyData.totalPendingTransactions = getTransactions.length;

    let totalAmount = 0


    let totalPending_PaidCount = await AffiliateLink.find({
      isDeleted: false,
      admin_paid: "pending",
    });

    let totalAdminPendingPrice = 0;
    let idArr = []


    for (let item of totalPending_PaidCount) {
      totalAdminPendingPrice += item.price || 0;
      idArr.push(item.id || item._id);
    }

    const stripe_fee = calculateStripeFee(totalAmount);

    monthlyData.admin_pending_total_price = totalAdminPendingPrice;
    monthlyData.admin_paid_count = totalPending_PaidCount.length;
    monthlyData.totalPayableAmount = totalAdminPendingPrice + stripe_fee;
    monthlyData.transaction_ids = idArr;

    return res.status(200).json({ success: true, data: monthlyData });
  } catch (err) {
    console.log("error", err);
    sails.log.error("Payable Monthly Pending Transactions error:", err);
    return res.serverError({ success: false, message: err.message });
  }
};

exports.payCommissionAdmin = async (req, res) => {
  try {
    const { affiliateIds } = req.body;

    if (!Array.isArray(affiliateIds) || !affiliateIds.length) {
      return response.failed(null, "affiliate Link Ids is required", req, res);
    }

    // Debug: Log what we're looking for

    const affiliateLinks = await AffiliateLink.find({
      where: {
        id: affiliateIds,  // Direct array, no $in operator
        isDeleted: false
      }
    });

    console.log("Found affiliate links:", affiliateLinks?.length || 0);

    if (!affiliateLinks || !affiliateLinks.length) {
      // Check if any IDs exist at all
      const anyLinks = await AffiliateLink.find({
        where: {
          id: affiliateIds
        }
      });

      console.log("Any links found (including deleted):", anyLinks?.length || 0);

      if (anyLinks && anyLinks.length) {
        const deletedLinks = anyLinks.filter(link => link.isDeleted === true);
        console.log("Deleted links found:", deletedLinks.length);
      }

      return response.failed(null, `Affiliate links not found. Checked IDs: ${affiliateIds.join(', ')}`, req, res);
    }

    // 2️⃣ Get admin
    const admin = await Users.findOne({ role: "admin" });
    if (!admin) {
      return response.failed(null, "Admin not found", req, res);
    }

    // 3️⃣ Invoice directory
    const invoicesDir = path.join(__dirname, "../../assets", "invoices");
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const transactions = [];
    const processedIds = [];

    // 4️⃣ Process each affiliate link
    for (const link of affiliateLinks) {
      console.log(`Processing link ID: ${link.id}, Admin paid: ${link.admin_paid}`);

      // Prevent double payment
      if (link.admin_paid == "paid") {
        console.log(`Skipping ${link.id} - already paid`);
        continue;
      }

      const amount = Number(link.amount_of_commission || 0);
      if (!amount || amount <= 0) {
        console.log(`Skipping ${link.id} - invalid amount: ${amount}`);
        continue;
      }

      const total_amount = Number(amount.toFixed(2));
      console.log(`Processing payment of $${total_amount} for link ${link.id}`);

      const invoicesDir = path.join(__dirname, '../../assets', 'invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const filename = `invoice_${link.id}_${Date.now()}.pdf`;
      const outputPath = path.join(invoicesDir, filename);

      const payload = {
        commission: amount,
        // stripe_fees: stripe_fee,
        // platform_fee: commission_override,
        total_amount
      }
      // Generate PDF and wait for it to complete
      await htmlToPdf(invoice_itm_html(payload), outputPath);
      const custom_invoice_url = `invoices/${filename}`

      console.log("PDF created:", custom_invoice_url);

      // const get_campaign = await BrandAffiliateAssociation.findOne({ affiliate_id: link.affiliate_id,  status:"accepted" })

      let data = {
        user_id: req.identity?.id,
        paid_to: admin.id || "654227e78fd3b1018600710d",
        transaction_type: "pay_commission",
        transaction_id: "",
        stripe_charge_id: "",
        // currency: get_campaign?.currencies,
        amount: total_amount.toFixed(2),
        transaction_status: "pending",
        special_plan_id: null,
        subscription_id: null,
        stripe_subscription_id: "",
        addedBy: req.identity?.id,
        updatedBy: null,
        paypal_transaction_id: "",
        paypal_transaction_status: "",
        affiliateLinkId: link.id || link._id,
        custom_invoice_url
      };

      let transaction = await Transactions.create(data);
      transactions.push(transaction)
      // 7️⃣ Update affiliate link
      try {
        const updatedLink = await AffiliateLink.updateOne({ id: link.id })
          .set({
            admin_paid: "paid",
          });

        if (updatedLink) {
          processedIds.push(updatedLink.id || updatedLink._id)
          console.log(`Marked link ${link.id} as paid`);
        }
      } catch (updateError) {
        console.error(`Failed to update link ${link.id}:`, updateError);
        // Don't fail the whole process if update fails
      }
    }
    return response.success(
      {
        transactions,
        processedIds,
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
        count: transactions.length
      },
      `Successfully processed ${transactions.length} commission payment(s)`,
      req,
      res
    );
  }



  catch (error) {
    console.error("Pay commission admin error:", error);
    return response.failed(null, error.message || error.toString(), req, res);
  }
};

function calculateStripeFee(amount) {
  const PERCENT_FEE = 0.029; // 2.9%
  const FIXED_FEE = 0.3; // $0.30

  return amount * PERCENT_FEE + FIXED_FEE;
}

const invoice_itm_html = (payload) => {

  // const { commission, stripe_fees, platform_fee, total_amount } = payload

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
      <img src=${credentials.BACK_WEB_URL}/images/logo.png alt="Upfilly Logo" />
      <h2>Invoice</h2>
    </div>

    <div class="invoice-details">
      <p><strong>Invoice ID:</strong> #INV-${Date.now()}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-CA')}</p>
    </div>

    <table class="invoice-table">
      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>
      <tr>
        <td style="text-align:left;">Main Amount</td>
        <td>${payload.commission}</td>
      </tr>
      <tr>
        <td style="text-align:left;">Stripe Fees</td>
        <td>${payload.stripe_fees}</td>
      </tr>
      <tr>
        <td style="text-align:left;">Upfilly Platform Fee</td>
        <td>${payload.platform_fee}</td>
      </tr>
      <tr class="total-row">
        <td style="text-align:left;">Total Payout</td>
        <td>${payload.total_amount}</td>
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

async function htmlToPdf(html, outputPath) {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: credentials.LOCAL ? '/usr/bin/google-chrome' : '/usr/bin/chromium-browser',
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