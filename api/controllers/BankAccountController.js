"use strict";

const stripeServices = require("../services/StripeServices");
const constants = require("../../config/constants");
const stripe = require('stripe')(process.env.STRIPE_KEY);

/** common function for create account onboarding link */

const accountDetailLink = async (userId) => {
    try {
        console.log("addedBy", userId)
        let dataObject;
        const getAccountId = await Account.findOne({ addedBy: userId, isActive: true })
        if (getAccountId) {
            dataObject = { accountId: getAccountId.accountId, userId: userId }
        } else {
            return false
        }
        const createLink = await stripeServices.create_account_link(dataObject)

        if (createLink) {
            return createLink

        }
    } catch (error) {
        return false
    }
}
const ReGenerateAccountDetailLink = async (accountId) => {
    try {
        console.log("accountId", accountId)
        const createLink = await stripeServices.create_account_link({ accountId })

        if (createLink) {
            return createLink

        }
    } catch (error) {
        console.log(error)
        return false
    }
}
module.exports = {
    /** create account link */
    createAccount: async (req, res) => {
        try {
            const { email, businessName, country } = req.body
            if (!email || !businessName || !country) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "400",
                        message: constants.onBoarding.PAYLOAD_MISSING
                    }
                })
            }
            
            const dataObject = { email, businessName, country }
            const createBankAccount = await stripeServices.add_bank_account(dataObject)

            const findAndUpdate = await Account.updateMany({ addedBy: req.identity.id, isActive: true }, { isActive: false })

            const saveAccountId = await Account.create({
                status: "active",
                accountId: createBankAccount.id,
                addedBy: req.identity.id,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            if (saveAccountId) {
                const link = await accountDetailLink(req.identity.id)

                return res.status(200).json({
                    success: true,
                    data: link,
                    message: constants.BANK_ACCOUNT.CREATED
                })
            }
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "400",
                    message: " " + error
                }
            })
        }
    },
    /** Update Account Details */
    webhook: async (request, response) => {
        try {

            switch (request.body.type) {
                case "account.updated":
                    const eventObject = request.body.data.object;

                    const findAccount = await Account.findOne({ accountId: eventObject.id });

                    if (findAccount) {
                        const updateObject = {
                            transfer: eventObject.capabilities.transfers || "",
                            account_holder_name: eventObject.external_accounts?.data[0]?.account_holder_name || "",
                            bank_name: eventObject.external_accounts?.data[0]?.bank_name || "",
                            country: eventObject.external_accounts?.data[0]?.country || "",
                            currency: eventObject.external_accounts?.data[0]?.currency || "",
                            accountStatus: eventObject.external_accounts?.data[0]?.status || "",
                            routingNumber: eventObject.external_accounts?.data[0]?.routing_number || "",
                            bankAccountNumber: eventObject.external_accounts?.data[0].last4
                        };

                        await Account.updateOne({ accountId: eventObject.id }, { $set: updateObject });

                        console.log("Account updated successfully");

                    } else {
                        console.log("Account not found");
                    }
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
                        message: constants.onBoarding.PAYLOAD_MISSING
                    }
                })
            }

            const createLink = await ReGenerateAccountDetailLink(accountId);
            console.log("createLink", createLink)
            return res.status(200).json({
                success: true,
                data: createLink
            })
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "400",
                    message: " " + error
                }
            })
        }
    },
    updateAccountStatus: async (req, res) => {
        try {
            const { accountId, status, userId } = req.body;

            if (!accountId || status === undefined) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "400",
                        message: constants.onBoarding.PAYLOAD_MISSING
                    }
                });
            }

            if (status === true) {

                const activeAccount = await Account.find({ userId: userId, isActive: true });
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
                        message: constants.BANK_ACCOUNT.ACCOUNT_STATUS_UPDATED
                    });
                } else {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: "400",
                            message: constants.BANK_ACCOUNT.UPDATE_FAILED
                        }
                    });
                }
            }


            if (status === false) {

                await Account.updateMany({ userId: userId }, { isActive: false });

                const latestAccount = await Account.findOne({ userId: userId }).sort({ createdAt: -1 });

                if (latestAccount) {
                    await Account.updateOne({ accountId: latestAccount.accountId }).set({ isActive: true });
                    return res.status(200).json({
                        success: true,
                        message: constants.BANK_ACCOUNT.LATEST_ACCOUNT_ACTIVATED
                    });
                } else {
                    return res.status(404).json({
                        success: false,
                        error: {
                            code: "404",
                            message: constants.BANK_ACCOUNT.ACCOUNT_NOT_FOUND
                        }
                    });
                }
            }
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: {
                    code: "500",
                    message: "Server error: " + error.message
                }
            });
        }
    },
    /** Used to fetch transfer listing */
    transferListing: async (req, res) => {
        try {
            const { page, count, sortBy, search } = req.body

            const sortquery = {}

            if (sortBy) {
                const [field, sortType] = sortBy.split(" ");
                sortquery[field || "createdAt"] = sortType === "desc" ? -1 : 1;
            } else {
                sortquery.createdAt = -1;
            }
            const query = {}

            if (search) {
                query.$or = [
                    { "paidTo.name": { $regex: search, $options: "i" } },
                    { "paidTo.fullName": { $regex: search, $options: "i" } },
                    { "paidTo.venue_name": { $regex: search, $options: "i" } },
                    { "paidTo.email": { $regex: search, $options: "i" } }

                ]
            }
            const pipeline = [
                {
                    $lookup: {
                        from: "users",
                        localField: "paidTo",
                        foreignField: "_id",
                        as: "paidToDetails"
                    }
                },
                {
                    $unwind: {
                        path: "$paidToDetails",
                        preserveNullAndEmptyArrays: true
                    }
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
                        updatedAt: "$updatedAt"
                    }
                }
            ]
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
                error: {

                }
            })
        }
    },
    /** Used to fetch transfer detail */
    transferDetail: async (req, res) => {
        try {
            const { id } = req.query
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "400",
                        message: constants.onBoarding.PAYLOAD_MISSING
                    }
                })
            }

            const transferDetail = await Transfer.findOne({ _id: id }).populate("paidTo")
            if (transferDetail) {
                return res.status(200).json({
                    success: true,
                    data: transferDetail,
                    message: constants.BANK_ACCOUNT.DETAIL
                })
            }
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "400",
                    message: " " + error
                }
            })
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
            const accountDetails = await stripeServices.retrieve_account("acct_1QhTNgBUjnhDIjAq");


            return res.status(200).json({
                success: true,
                data: {
                    accountDetails,
                }
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "400",
                    message: "Error retrieving account details: " + error.message
                }
            });
        }
    },
}
