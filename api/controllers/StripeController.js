const constants = require('../../config/constants.js').constants;
const credentials = require('../../config/local.js'); //sails.config.env.production;
const stripe = require("stripe")(credentials.PAYMENT_INFO.SECREATKEY);
const response = require('../services/Response');
const Services = require('../services/index');
const Validations = require("../Validations/index");
const db = sails.getDatastore().manager;
const ObjectId = require('mongodb').ObjectId;
const Emails = require('../Emails/index.js');
var fs = require('fs');

generateName = function () {
    // action are perform to generate random name for every file
    var uuid = require('uuid');
    var randomStr = uuid.v4();
    var date = new Date();
    var currentDate = date.valueOf();

    retVal = randomStr + currentDate;
    return retVal;
};

exports.addCard = async (req, res) => {
    try {

        let validation_result = await Validations.CardsValidations.addCard(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let user_id = req.body.user_id;
        let stripe_customer_id;
        let get_user = await Users.findOne({ id: user_id });
        if (!get_user) {
            throw constants.CARD.INVALID_USER_ID;
        }

        var cardNumber = String(req.body.card_number);
        last4 = cardNumber.slice(cardNumber.length - 4);
        const cards = await Cards.find({ user_id: user_id, last4: last4 })
        /**User can't add same card multiple time */
        if (cards && cards.length > 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 400,
                    message: constants.CARD.CARD_EXIST,
                },
            });
        }

        stripe_customer_id = get_user.stripe_customer_id;

        if (!get_user.stripe_customer_id) {
            let create_customer_payload = {
                fullName: get_user.fullName,
                email: get_user.email,
                country: req.body.country ? req.body.country : "",
                postal_code: req.body.postal_code ? req.body.postal_code : "",
            }

            let create_stripe_customer = await Services.StripeServices.create_customer(create_customer_payload);
            if (create_stripe_customer) {
                let update_user = await Users.updateOne({
                    id: user_id
                },
                    {
                        stripe_customer_id: create_stripe_customer.id,
                        updatedBy: user_id
                    }
                );
                stripe_customer_id = create_stripe_customer.id;
            } else {
                throw constants.CARD.UNABLE_TO_CREATE_STRIPE_CUSTOMER;
            }
        }


        let card_details = {
            card_number: req.body.card_number,
            exp_month: req.body.exp_month,
            exp_year: req.body.exp_year,
            cvc: req.body.cvc,
            fullName: get_user.fullName,
        }
        let create_customer_source;
        let create_card_token = await Services.StripeServices.create_token(card_details);
        if (create_card_token) {
            create_customer_source = await Services.StripeServices.create_customer_source({
                stripe_customer_id: stripe_customer_id,
                token_id: create_card_token.id
            });
        } else {
            throw constants.CARD.UNABLE_TO_CREATE_CUSTOMER_SOURCE;
        }

        let get_primary_card = await Cards.findOne({ user_id: get_user.id, isDeleted: false, isPrimary: true });
        if (!get_primary_card) {
            req.body.isPrimary = true;
        }

        req.body.addedBy = user_id;
        req.body.user_id = user_id;
        req.body.card_id = create_customer_source.id;
        req.body.last4 = create_customer_source.last4;
        let add_card = await Cards.create(req.body).fetch();
        if (add_card) {
            if (add_card.isPrimary) {
                let update_default_source = await Services.StripeServices.update_stripe_customer({
                    stripe_customer_id: stripe_customer_id,
                    source_id: create_customer_source.id
                })

            }
            return response.success(add_card, constants.CARD.ADDED, req, res);
        }

        throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getCardById = async (req, res) => {
    try {
        const id = req.param('id');
        if (!id) {
            throw constants.CARD.ID_REQUIRED;
        }

        let get_card = await Cards.findOne({ id: id });
        if (get_card) {
            let get_user = await Users.findOne({ id: get_card.user_id });
            let get_card_details = await Services.StripeServices.retrieve_source({
                stripe_customer_id: get_user.stripe_customer_id,
                card_id: get_card.card_id
            })
            if (get_card_details) {
                get_card.card_details = get_card_details;
            }
            return response.success(get_card, constants.CARD.FETCHED, req, res);
        }

        throw constants.CARD.INVALID_ID;

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getAllCards = async (req, res) => {
    try {

        let page = req.param('page') || 1;
        let count = req.param('count') || 10;
        let search = req.param("search")
        let isDeleted = req.param("isDeleted");
        let user_id = req.param("user_id");
        let skipNo = (page - 1) * count;
        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, '$options': 'i' } },
            ]
        }

        if (isDeleted) {
            if (isDeleted === 'true') {
                isDeleted = true;
            } else {
                isDeleted = false;
            }
            query.isDeleted = isDeleted;
        } else {
            query.isDeleted = false;
        }

        if (user_id) {
            query.user_id = new ObjectId(user_id);
        }

        // console.log(JSON.stringify(query), '-------query');
        let totalresult = await  db.collection('cards').aggregate([
            {
                $project: {
                    id: "$_id",
                    card_id: "$card_id",
                    isPrimary: "$isPrimary",
                    user_id: "$user_id",
                    addedBy: "$addedBy",
                    updatedBy: "$updatedBy",
                    isDeleted: "$isDeleted",
                    createdAt: "$createdAt",
                    updatedAt: "$updatedAt",
                }
            },
            {
                $match: query
            }
        ]).toArray();
            if (err) {
                return response.failed(null, `${err}`, req, res);
            }

            let result = await   db.collection('cards').aggregate([
                {
                    $project: {
                        id: "$_id",
                        card_id: "$card_id",
                        isPrimary: "$isPrimary",
                        user_id: "$user_id",
                        addedBy: "$addedBy",
                        updatedBy: "$updatedBy",
                        isDeleted: "$isDeleted",
                        createdAt: "$createdAt",
                        updatedAt: "$updatedAt",
                    },
                },
                {
                    $match: query
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $skip: Number(skipNo)
                },
                {
                    $limit: Number(count)
                }

            ]).toArray();
                if (err) {
                    return response.failed(null, `${err}`, req, res);
                }

                if (result && result.length > 0) {
                    for await (let item of result) {
                        let get_user = await Users.findOne({ id: `${item.user_id}` });
                        // console.log(get_user,"--get_user");
                        let get_card_details = await Services.StripeServices.retrieve_source({
                            stripe_customer_id: get_user.stripe_customer_id,
                            card_id: item.card_id
                        })
                        if (get_card_details) {
                            item.card_details = get_card_details;
                        }
                    }
                }

                let resData = {
                    total: totalresult ? totalresult.length : 0,
                    data: result ? result : []
                }
                return response.success(resData, constants.CARD.FETCHED, req, res)
          
    } catch (err) {
        return response.failed(null, `${err}`, req, res)
    }
}

exports.deleteCard = async (req, res) => {
    try {
        const id = req.param('id');

        if (!id) {
            throw constants.SUBSCRIPTION_PLAN.ID_REQUIRED;
        }

        let get_card = await Cards.findOne({ id: id, isDeleted: false });
        if (!get_card) {
            throw constants.CARD.INVALID_ID;
        }

        if (get_card.isPrimary) {
            throw constants.CARD.CANT_DELETE_PRIMARY_CARD;
        }

        let get_user = await Users.findOne({ id: get_card.user_id });
        if (!get_user) {
            throw constants.CARD.INVALID_USER_ID;
        }

        let delete_source = await Services.StripeServices.delete_source({
            stripe_customer_id: get_user.stripe_customer_id,
            card_id: get_card.card_id
        })

        if (delete_source) {
            let delete_card = await Cards.updateOne({ id: id }, { isDeleted: true, updatedBy: req.identity.id });
            if (delete_card) {
                return response.success(null, constants.CARD.DELETED, req, res);
            }
        }
        throw constants.COMMON.SERVER_ERROR;

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.setPrimaryCard = async (req, res) => {
    try {
        const id = req.body.id;
        if (!id) {
            throw constants.CARD.ID_REQUIRED;
        }

        let get_card = await Cards.findOne({ id: id, isDeleted: false });
        if (get_card) {
            let get_user = await Users.findOne({ id: get_card.user_id });
            if (!get_user) {
                throw constants.CARD.USER_NOT_FOUND;
            }

            if (get_user.id != req.identity.id) {
                throw constants.CARD.UNAUTHORIZED;
            }

            let update_default_source = await Services.StripeServices.update_stripe_customer({
                stripe_customer_id: get_user.stripe_customer_id,
                source_id: get_card.card_id
            })
            if (update_default_source) {
                let update_other_cards = await Cards.update({ user_id: req.identity.id }, { isPrimary: false, updatedBy: req.identity.id }).fetch()
                if (update_other_cards && update_other_cards.length > 0) {
                    const set_primary_card = await Cards.updateOne({ user_id: req.identity.id, card_id: get_card.card_id }, { isPrimary: true });
                    if (set_primary_card) {
                        return response.success(null, constants.CARD.PRIMARY_SET, req, res);
                    }
                } else {
                    throw constants.COMMON.SERVER_ERROR;
                }
            } else {
                throw constants.COMMON.SERVER_ERROR;
            }
        }

        throw constants.CARD.INVALID_ID

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

// exports.uploadFrontImage = async (req, res) => {
//     var rootpath = process.cwd();
//     req.file("file").upload(
//         {
//             maxBytes: 10485760,
//             dirname: require("path").resolve(
//                 rootpath,
//                 "assets/frontdoc"
//             ),
//         },
//         async (err, uploadedFiles) => {
//             if (err) {
//                 if (err.code == 'E_EXCEEDS_UPLOAD_LIMIT') {
//                     return res.status(404).json({ "success": false, "error": { "code": 404, "message": "Please Select Image Below 10Mb" } });
//                 }
//             }


//             var the_string = uploadedFiles[0].fd;

//             const filename = the_string.substring(the_string.lastIndexOf("/") + 1);
//             uploadedFiles.forEach(async (element, index) => {
//                 var name = generateName();
//                 //(element.fd);
//                 typeArr = element.type.split('/');
//                 fileExt = typeArr[1];

//                 if (
//                     fileExt === 'jpeg' ||
//                     fileExt === 'JPEG' ||
//                     fileExt === 'JPG' ||
//                     fileExt === 'jpg' ||
//                     fileExt === 'PNG' ||
//                     fileExt === 'png'
//                 ) {
//                     fs.readFile(uploadedFiles[index].fd, async (err, data) => {
//                         if (err) {
//                             return res.status(403).json({
//                                 success: false,
//                                 error: {
//                                     code: 403,
//                                     message: err,
//                                 },
//                             });
//                         }
//                         fs.writeFile(
//                             './.tmp/public/images/' +

//                             filename +
//                             '.' +
//                             fileExt,
//                             data,

//                             async function (err, image) {
//                                 if (err) {
//                                     //(err);
//                                     return res.status(400).json({
//                                         success: false,
//                                         error: {
//                                             code: 400,
//                                             message: err,
//                                         },
//                                     });

//                                 }
//                             }
//                         );


//                     }); //end of loop
//                 } else {
//                     return res.status(404).json({
//                         success: false,
//                         error: {
//                             code: 404,
//                             message: constants.user.INVALID_FILE_TYPE,
//                         },
//                     });
//                 }
//             });

//             return res.status(200).json({
//                 success: true,
//                 code: 200,
//                 data: {
//                     fullPath: uploadedFiles[0].fd,
//                     filename: uploadedFiles[0].filename,
//                     imagePath: filename,
//                 },
//             });
//         }
//     );
// }

exports.uploadFrontImage = async (req, res) => {
    try {
        var rootpath = process.cwd();
        req
            .file('file')
            .upload(
                {
                    maxBytes: 5242880, dirname: require("path").resolve(
                        rootpath,
                        "assets/frontdoc"
                    ),
                },
                async (err, file) => {
                    var the_string = file[0].fd;
                    var filename = the_string.substring(the_string.lastIndexOf("/") + 1);
                    // console.log(file);
                    ////(file)
                    if (err) {
                        if (err.code == 'E_EXCEEDS_UPLOAD_LIMIT') {
                            return res.status(404).json({
                                success: false,
                                error: {
                                    code: 404,
                                    message: 'Image size must be less than 5 MB',
                                },
                            });
                        }
                    }

                    var responseData = {};

                    file.forEach(async (element, index) => {
                        var name = await generateName();
                        //(element.fd);
                        typeArr = element.type.split('/');
                        fileExt = typeArr[1];

                        if (
                            fileExt === 'jpeg' ||
                            fileExt === 'JPEG' ||
                            fileExt === 'JPG' ||
                            fileExt === 'jpg' ||
                            fileExt === 'PNG' ||
                            fileExt === 'png'
                        ) {
                            fs.readFile(file[index].fd, async (err, data) => {
                                if (err) {
                                    return res.status(403).json({
                                        success: false,
                                        error: {
                                            code: 403,
                                            message: err,
                                        },
                                    });
                                } else {
                                    if (data) {
                                        var path = file[index].fd;
                                        fs.writeFile(
                                            'assets/frontdoc/' +
                                            name +
                                            '.' +
                                            fileExt,
                                            data,

                                            function (err, image) {
                                                if (err) {
                                                    //(err);
                                                    return res.status(400).json({
                                                        success: false,
                                                        error: {
                                                            code: 400,
                                                            message: err,
                                                        },
                                                    });

                                                }
                                            }
                                        );
                                        fs.writeFile(
                                            './.tmp/public/frontdoc/' +
                                            name +
                                            '.' +
                                            fileExt,
                                            data,

                                            async function (err, image) {
                                                if (err) {
                                                    //(err);
                                                    return res.status(400).json({
                                                        success: false,
                                                        error: {
                                                            code: 400,
                                                            message: err,
                                                        },
                                                    });

                                                }
                                            }
                                        );

                                        responseData.imagePath = name + '.' + fileExt;
                                        responseData.fullpath =
                                            '/frontdoc/' + name + '.' + fileExt;
                                        responseData.filename = file[0].filename;
                                        // //(responseData ,"responsedata");

                                        if (index == file.length - 1) {

                                            fs.unlink(file[index].fd, function (err) {
                                                if (err) {
                                                    //(err, "unlink not done")
                                                }
                                            });

                                            await new Promise(resolve => setTimeout(resolve, 6000));

                                            return res.json({
                                                success: true,
                                                code: 200,
                                                fullPath: responseData.fullpath,
                                                filename: responseData.filename,
                                                imagePath: responseData.imagePath,
                                            });

                                        }
                                    }
                                }
                            }); //end of loop
                        } else {
                            return res.status(404).json({
                                success: false,
                                error: {
                                    code: 404,
                                    message: constants.user.INVALID_FILE_TYPE,
                                },
                            });
                        }
                    });
                }
            );
    } catch (err) {
        // console.log(err, "rrr")
        return res
            .status(500)
            .json({ success: false, error: { code: 500, message: '' + err } });
    }
}

exports.uploadBackImage = async (req, res) => {
    try {
        var rootpath = process.cwd();
        req
            .file('file')
            .upload(
                {
                    maxBytes: 5242880, dirname: require("path").resolve(
                        rootpath,
                        "assets/backdoc"
                    ),
                },
                async (err, file) => {
                    var the_string = file[0].fd;
                    var filename = the_string.substring(the_string.lastIndexOf("/") + 1);
                    // console.log(file);
                    ////(file)
                    if (err) {
                        if (err.code == 'E_EXCEEDS_UPLOAD_LIMIT') {
                            return res.status(404).json({
                                success: false,
                                error: {
                                    code: 404,
                                    message: 'Image size must be less than 5 MB',
                                },
                            });
                        }
                    }

                    var responseData = {};

                    file.forEach(async (element, index) => {
                        var name = await generateName();
                        console.log(name, "==name");
                        //(element.fd);
                        typeArr = element.type.split('/');
                        fileExt = typeArr[1];

                        if (
                            fileExt === 'jpeg' ||
                            fileExt === 'JPEG' ||
                            fileExt === 'JPG' ||
                            fileExt === 'jpg' ||
                            fileExt === 'PNG' ||
                            fileExt === 'png'
                        ) {
                            fs.readFile(file[index].fd, async (err, data) => {
                                if (err) {
                                    return res.status(403).json({
                                        success: false,
                                        error: {
                                            code: 403,
                                            message: err,
                                        },
                                    });
                                } else {
                                    if (data) {
                                        var path = file[index].fd;
                                        fs.writeFile(
                                            'assets/backdoc/' +
                                            name +
                                            '.' +
                                            fileExt,
                                            data,

                                            function (err, image) {
                                                if (err) {
                                                    //(err);
                                                    return res.status(400).json({
                                                        success: false,
                                                        error: {
                                                            code: 400,
                                                            message: err,
                                                        },
                                                    });

                                                }
                                            }
                                        );
                                        fs.writeFile(
                                            './.tmp/public/backdoc/' +
                                            name +
                                            '.' +
                                            fileExt,
                                            data,

                                            async function (err, image) {
                                                if (err) {
                                                    //(err);
                                                    return res.status(400).json({
                                                        success: false,
                                                        error: {
                                                            code: 400,
                                                            message: err,
                                                        },
                                                    });

                                                }
                                            }
                                        );

                                        responseData.imagePath = name + '.' + fileExt;
                                        responseData.fullpath =
                                            '/backdoc/' + name + '.' + fileExt;
                                        responseData.filename = file[0].filename;
                                        // //(responseData ,"responsedata");

                                        if (index == file.length - 1) {

                                            fs.unlink(file[index].fd, function (err) {
                                                if (err) {
                                                    //(err, "unlink not done")
                                                }
                                            });

                                            await new Promise(resolve => setTimeout(resolve, 6000));

                                            return res.json({
                                                success: true,
                                                code: 200,
                                                fullPath: responseData.fullpath,
                                                filename: responseData.filename,
                                                imagePath: responseData.imagePath,
                                            });

                                        }
                                    }
                                }
                            }); //end of loop
                        } else {
                            return res.status(404).json({
                                success: false,
                                error: {
                                    code: 404,
                                    message: constants.user.INVALID_FILE_TYPE,
                                },
                            });
                        }
                    });
                }
            );
    } catch (err) {
        // console.log(err, "rrr")
        return res
            .status(500)
            .json({ success: false, error: { code: 500, message: '' + err } });
    }
}

exports.uploadStripeVerificationDocument = async (req, res) => {
    var file_name = req.body.image;
    var path = req.body.path;
    var rootpath = process.cwd();
    var fp = fs.readFileSync(rootpath + "/assets" + path);
    await stripe.files.create(
        {
            purpose: "identity_document",
            file: {
                data: fp,
                name: file_name,
                type: "application/octet-stream",
            },
        },
        function (err, file) {
            if (err) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error: { code: err.statusCode, message: err.message },
                    });
            } else {
                return res.status(200).json({
                    success: true,
                    message: "file added!!",
                    data: file,
                });
            }
        }
    );
}

exports.addBank = async (req, res) => {
    try {
        // const tax
        // console.log("in bank api");
        let validation_result = await Validations.StripeValidation.addBankOnStripe(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        const data = req.body
        var email = data.email
        var account_holder_name = data.accountholder_name
        var routing_number = data.routing_number
        var account_number = data.account_number
        var first_name = data.first_name
        var last_name = data.last_name
        var ssn_number = data.ssn_number
        var ssn_last_4_digit = ssn_number.substr(-4);
        var dob = data.dob
        var mobile = data.mobile
        var address = data.address
        var country = data.country
        var company_name = data.company_name
        var user_id = data.user_id
        // = await Taxes.findOne({ userId: req.identity.id, isDefault: true })
        // data.ssn = tax.ssn
        // if (req.identity.account_id != undefined && req.identity.account_id != "") {
        //     // return;
        //     console.log('=======already have ==========');
        //     const bankAccount = await stripe.accounts.createExternalAccount(
        //         req.identity.account_id,
        //         {
        //             external_account: {
        //                 object: 'bank_account',
        //                 "account_holder_name": account_holder_name,
        //                 "account_holder_type": "individual",
        //                 "country": "US",
        //                 "currency": "usd",
        //                 "routing_number": routing_number,
        //                 "account_number": account_number,
        //                 // default_for_currency: true,
        //             },
        //         }
        //     );

        //     // //-------------- Added on 3 Aug 2023 For bank account verification --------------//
        //     // // let create_bank_token = await Services.Stripe.create_bank_token({
        //     // //   country: "US",
        //     // //   currency: "usd",
        //     // //   routing_number: routing_number,
        //     // //   account_number: account_number,
        //     // //   account_holder_name: account_holder_name,
        //     // //   account_holder_type: "individual",
        //     // // })

        //     // // if (create_bank_token) {
        //     //   let verify_source = await Services.Stripe.verify_source({
        //     //     customer_id: req.identity.customer_id,
        //     //     bank_id: bankAccount.id
        //     //   })
        //     // // }


        //     if (req.identity.customer_id) {
        //         let update_user = await Users.updateOne({ id: req.identity.id }, {
        //             customer_id: req.identity.customer_id
        //         });

        //         const create_source = await stripe.customers.createSource(
        //             req.identity.customer_id,
        //             {
        //                 source: {
        //                     object: "bank_account",
        //                     country: "US",
        //                     currency: "usd",
        //                     account_holder_name: account_holder_name,
        //                     account_holder_type: "individual",
        //                     routing_number: routing_number,
        //                     account_number: account_number,
        //                 }
        //             }
        //         );

        //         const update_source = await stripe.customers.updateSource(
        //             req.identity.customer_id,
        //             create_source.id,
        //             { metadata: create_source }
        //         );

        //         await Services.Email.bank_account_verification({
        //             email: req.identity.email
        //         });

        //         // const verify_source = await stripe.customers.verifySource(
        //         //   req.identity.customer_id,
        //         //   create_source.id,
        //         //   { amounts: [32, 45] }
        //         // );

        //         // console.log(verify_source, '==================verify_source1111');
        //     }



        //     //   //-------------- Added on 3 Aug 2023 For bank account verification --------------//

        //     var bankDetail = {
        //         account_id: req.identity.account_id,
        //         external_account_id: bankAccount.id,
        //         last4: bankAccount.last4,
        //         bank_name: bankAccount.bank_name,
        //         type: data.type,
        //         account_holder_name: account_holder_name,
        //         routing_number: bankAccount.routing_number, userId: req.identity.id, createdAt: new Date(), updatedAt: new Date()
        //     }



        //     const createdBankDetail = await Banks.create(bankDetail).fetch()
        //     if (createdBankDetail) {
        //         const payout = await stripe.transfers.create({   // Added on 7 Aug 2023
        //             amount: Math.floor(Math.random() * 20) + 1,
        //             currency: "usd",
        //             destination: createdBankDetail.account_id,
        //         });

        //         if (payout) {
        //             await Services.Email.bank_account_verification_amount_sent({
        //                 email: req.identity.email,
        //                 bank_account_id: createdBankDetail.id,
        //             });

        //             let update_account = await Banks.updateOne({ id: createdBankDetail.id }, {
        //                 amount_transfer: payout.amount
        //             });

        //         }
        //         let create_account_link = await Services.Stripe.create_account_link({
        //             account_id: createdBankDetail.account_id,
        //             type: "account_onboarding",
        //             return_url: "account_onboarding",
        //         });
        //         if (create_account_link) {
        //             bankAccount.accountLink = create_account_link;
        //         }

        //         // console.log(payout, "[payout]");
        //     }

        //     return res.json({ success: true, code: 200, bankAccount })
        // } else {
        const account = await stripe.accounts.create({
            type: 'custom',
            country: country,
            email: email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_profile: {
                mcc: "7230",
                url: "www.googleleadservice.com"
            },

            // type : "express"
        });

        // console.log(account, '[account]');
        const bankAccount = await stripe.accounts.createExternalAccount(
            account.id,
            {
                external_account: {
                    object: 'bank_account',
                    "account_holder_name": account_holder_name,
                    "account_holder_type": "individual",
                    "country": "US",
                    "currency": "usd",
                    "routing_number": routing_number,
                    "account_number": account_number,
                    default_for_currency: true,
                },
            }
        );
        const updatedAccount = await stripe.accounts.update(
            account.id,
            {
                business_type: "individual",
                individual: {
                    email: email,
                    first_name: first_name,
                    last_name: last_name,
                    // dob: dob,
                    dob: dob, //{ day: 15, month: 3, year: 1990 },
                    phone: mobile,
                    id_number: ssn_number,
                    ssn_last_4: ssn_last_4_digit,
                    address: address,
                    // address: {
                    //     line1: "4620 Maple Court",
                    //     // line2: "4620 Maple Court",
                    //     city: "Taos",
                    //     state: "Missouri",
                    //     postal_code: "65101",
                    // },

                    verification: {
                        document: {
                            front: data.frontdoc,
                            back: data.backdoc,
                            //   "front": "file_1KHOE5H108022oCnCVjkEXTo",
                            //   "back": "file_1KHOELH108022oCnNVzgZ1LM"
                        },
                    },


                },
                company: {
                    name: company_name,
                    tax_id: ssn_number, // Replace with the actual TIN (EIN)
                },
                tos_acceptance: {
                    date: Math.floor(Date.now() / 1000), // Current timestamp
                    ip: '127.0.0.1', // Replace with the user's IP address
                },


            }
        );

        const updatedPayOut = await stripe.accounts.update(
            account.id,
            {
                settings: {
                    payouts: {
                        schedule: {
                            "delay_days": 5,
                            "interval": "daily"
                        }
                    }
                }
            }
        );

        const capability = await stripe.accounts.updateCapability(
            account.id,
            'transfers',
            { requested: true },
        );
        if (updatedAccount) {
            let create_customer = await stripe.customers.create({
                description: req.identity.email,
                email: req.identity.email,
                name: req.identity.fullName,
                address: {
                    line1: req.identity.street ? req.identity.street : '52 N Main ST',
                    city: req.identity.city ? req.identity.city : 'Johnstown',
                    state: 'OH',
                    postal_code: req.identity.zip_code ? req.identity.zip_code : '43210',
                    country: req.identity.country,
                },
            });

            if (create_customer) {
                let update_user = await Users.updateOne({ id: req.identity.id }, {
                    stripe_customer_id: create_customer.id
                });

                const create_source = await stripe.customers.createSource(
                    create_customer.id,
                    {
                        source: {
                            object: "bank_account",
                            country: "US",
                            currency: "usd",
                            account_holder_name: account_holder_name,
                            account_holder_type: "individual",
                            routing_number: routing_number,
                            account_number: account_number,
                            default_for_currency: true,
                        }
                    }
                );

                const update_source = await stripe.customers.updateSource(
                    create_customer.id,
                    create_source.id,
                    { metadata: create_source }
                );

                // await Services.Email.bank_account_verification({
                //     email: req.identity.email
                // });

                // const verify_source = await stripe.customers.verifySource(
                //   create_customer.id,
                //   create_source.id,
                //   { amounts: [32, 45] }
                // );

                // console.log(verify_source, '==================verify_source');
            }


            // //-------------- Added on 3 Aug 2023 For bank account verification --------------//

            var bankDetail = {
                account_id: account.id,
                external_account_id: bankAccount.id,
                last4: bankAccount.last4,
                bank_name: bankAccount.bank_name,
                isDefault: true,
                type: updatedAccount.type,
                account_holder_name: account_holder_name,
                routing_number: bankAccount.routing_number,
                userId: user_id,
                addedBy: req.identity.id
                // createdAt: new Date(),
                // updatedAt: new Date()
            }


            const createdBankDetail = await Banks.create(bankDetail).fetch();
            if (createdBankDetail) {
                // const payout = await stripe.transfers.create({   // Added on 7 Aug 2023
                //   amount: 1,
                //   currency: "usd",
                //   destination: createdBankDetail.account_id,
                // });
                // console.log(payout, '[payout 2]')
                //     let create_account_link = await Services.Stripe.create_account_link({
                //       account_id: createdBankDetail.account_id,
                //       type: "account_onboarding",
                //       return_url: "account_onboarding",
                //     });
                //     if (create_account_link) {
                //       updatedAccount.accountLink = create_account_link;
                //     }
            }
            const updatedUser = await Users.updateOne({ id: user_id }, { account_id: account.id, account_holder_name: account_holder_name, routing_number: routing_number, ssn_number: ssn_number, dob: dob });
            // console.log(updatedUser, "------------updatedUser");
        }
        return response.success(bankAccount, constants.TRANSACTION.BANK_ADDED, req, res);
        // return res.json({ success: true, code: 200, bankAccount, updatedAccount })
        // }

    } catch (err) {
        // console.log(err, '============err')
        return response.failed(null, `${err}`, req, res);
    }
}

// //For single payment
// exports.stripeAccountTransfer = async (req, res) => {
//     try {
//         let validation_result = await Validations.StripeValidation.stripeAccountTransfer(req, res);

//         if (validation_result && !validation_result.success) {
//             throw validation_result.message;
//         }
//         var { user_id, amount } = req.body;

//         let find_user = await Users.findOne({ id: user_id, isDeleted: false, status: "active" });
//         if (find_user && find_user.account_id != undefined && find_user.account_id != "") {
//             try {
//                 const payout = await stripe.transfers.create({   // Added on 1 Aug 2023, After payout issue, Replacing payout api with transfer api
//                     amount: Math.round(Number(amount) * 100),
//                     currency: "usd",
//                     destination: find_user.account_id,
//                 });

//                 transactionData = {}
//                 transactionData.amount = amount
//                 transactionData.user_id = find_user.id
//                 transactionData.transaction_status = "successfull"
//                 transactionData.chargeId = payout.id
//                 // transactionData.bookingId = options.bookingId
//                 transactionData.transaction_type = "bank_account"
//                 transactionData.createdAt = new Date()
//                 transactionData.updatedAt = new Date()

//                 const createdTransaction = await Transactions.create(transactionData).fetch()
//                 // console.log(createdTransaction, '==============createdTransaction');

//                 return response.success(createdTransaction, constants.TRANSACTION.SUCCESSFULLY, req, res);

//             } catch (err) {
//                 console.log(err, "error is here on transfer")
//                 dataToCreate = {}
//                 dataToCreate.user_id = find_user.id
//                 dataToCreate.amount = amount
//                 transactionData.transaction_type = "bank_account"
//                 transactionData.transaction_status = "pending"
//                 // dataToCreate.bookingId = options.bookingId
//                 dataToCreate.createdAt = new Date()
//                 dataToCreate.updatedAt = new Date()

//                 // if (options.hostAmount) {
//                 //     dataToCreate.hostAmount = options.hostAmount;
//                 // }

//                 // if (options.friend_level_id) {
//                 //     dataToCreate.friend_level_id = options.friend_level_id;
//                 // }

//                 // if (options.earning_type) {
//                 //     dataToCreate.earning_type = options.earning_type;
//                 // }

//                 // if (options.level_summary_id) {
//                 //     dataToCreate.level_summary_id = options.level_summary_id;
//                 // }

//                 // if (options.property_payout_payload) {
//                 //     dataToCreate.property_payout_payload = options.property_payout_payload;
//                 // }

//                 // if (options.casa_transfer_earning_type) {
//                 //     dataToCreate.casa_transfer_earning_type = options.casa_transfer_earning_type;
//                 // }

//                 // if (options.network_distribution_host_id_changed) {
//                 //     dataToCreate.network_distribution_host_id_changed = options.network_distribution_host_id_changed;
//                 // }

//                 // if (options.network_distribution_guest_id_changed) {
//                 //     dataToCreate.network_distribution_guest_id_changed = options.network_distribution_guest_id_changed;
//                 // }

//                 // if (options.friend_level_payload) {
//                 //     dataToCreate.friend_level_payload = options.friend_level_payload;
//                 // }


//                 const creadedPendingLog = await Transactions.create(dataToCreate).fetch();
//                 // console.log(creadedPendingLog, '==============createdTransaction1111');

//                 return response.failed(add_card, constants.TRANSACTION.ACCOUNT_NOT_CREATED, req, res);
//             }
//             // }else{

//             //     console.log("Acount not found")
//             //     dataToCreate = {}
//             // dataToCreate.userId = user.id
//             // dataToCreate.amount = options.amount
//             // dataToCreate.bookingId = options.bookingId
//             // dataToCreate.createdAt = new Date()
//             // dataToCreate.updatedAt = new Date()
//             // const creadedPendingLog = await PendingTransactions.create(dataToCreate) 
//             // }

//         } else {
//             // console.log("User account not created Yet")
//             dataToCreate = {}
//             dataToCreate.user_id = find_user.id
//             dataToCreate.amount = amount
//             transactionData.transaction_type = "bank_account"
//             transactionData.transaction_status = ""
//             // dataToCreate.bookingId = options.bookingId
//             dataToCreate.createdAt = new Date()
//             dataToCreate.updatedAt = new Date()


//             // if (options.hostAmount) {
//             //     dataToCreate.hostAmount = options.hostAmount;
//             // }

//             // if (options.friend_level_id) {
//             //     dataToCreate.friend_level_id = options.friend_level_id;
//             // }

//             // if (options.earning_type) {
//             //     dataToCreate.earning_type = options.earning_type;
//             // }

//             // if (options.level_summary_id) {
//             //     dataToCreate.level_summary_id = options.level_summary_id;
//             // }

//             // if (options.property_payout_payload) {
//             //     dataToCreate.property_payout_payload = options.property_payout_payload;
//             // }

//             // if (options.casa_transfer_earning_type) {
//             //     dataToCreate.casa_transfer_earning_type = options.casa_transfer_earning_type;
//             // }

//             // if (options.network_distribution_host_id_changed) {
//             //     dataToCreate.network_distribution_host_id_changed = options.network_distribution_host_id_changed;
//             // }

//             // if (options.network_distribution_guest_id_changed) {
//             //     dataToCreate.network_distribution_guest_id_changed = options.network_distribution_guest_id_changed;
//             // }

//             // if (options.friend_level_payload) {
//             //     dataToCreate.friend_level_payload = options.friend_level_payload;
//             // }

//             const creadedPendingLog = await Transactions.create(dataToCreate).fetch();
//             // console.log(creadedPendingLog, '==============createdTransaction222');

//             return response.failed(add_card, constants.TRANSACTION.ACCOUNT_NOT_CREATED, req, res);
//         }
//     } catch (error) {
//         return response.failed(null, `${error}`, req, res);
//     }

// }

// //For multiple payments
exports.stripeAccountTransfer = async (req, res) => {
    try {
        let validation_result = await Validations.StripeValidation.stripeAccountTransfer(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }
        var { user_id, event_type } = req.body;

        for await (var users of user_id) {
            if (users.user_id && users.user_id != null) {
                user_id = users.user_id
                var find_user = await Users.findOne({ id: user_id, isDeleted: false, status: "active" });

                if (find_user && find_user.account_id != undefined && find_user.account_id != "") {
                    try {
                        if (users.amount_type == "percentage") {
                            let find_campaign = await Campaign.findOne({ affiliate_id: find_user.id, event_type: users.event_type, isDeleted: false });
                            if (find_campaign) {
                                users.amount = (Number(users.amount) * Number(find_campaign.amount)) / 100;
                            } else {
                                return response.failed(null, `Campaign not created for ${find_user.fullName} for ${users.event_type} event`, req, res);
                            }
                        }

                        const payout = await stripe.transfers.create({   // Added on 1 Aug 2023, After payout issue, Replacing payout api with transfer api
                            amount: Math.round(Number(users.amount) * 100),
                            currency: "usd",
                            destination: find_user.account_id,
                        });
                        var transactionData = {}
                        transactionData.amount = users.amount
                        transactionData.user_id = req.identity.id
                        transactionData.paid_to = find_user.id
                        transactionData.transaction_status = "successful"
                        transactionData.stripe_charge_id = payout.id
                        transactionData.transaction_id = payout.id
                        transactionData.currency = payout.currency
                        // transactionData.bookingId = options.bookingId
                        transactionData.transaction_type = "bank_account"
                        transactionData.createdAt = new Date()
                        transactionData.updatedAt = new Date()

                        const createdTransaction = await Transactions.create(transactionData).fetch();
                        if (createdTransaction) {
                            let update_commisson_status = await CommissionsManagement.updateOne({ id: users.commission_id }, { status: "completed" });
                        }
                        // return response.success(createdTransaction, constants.TRANSACTION.SUCCESSFULLY, req, res);

                    } catch (err) {

                        dataToCreate = {}
                        dataToCreate.user_id = req.identity.id
                        dataToCreate.paid_to = find_user.id
                        dataToCreate.amount = users.amount
                        dataToCreate.transaction_type = "bank_account"
                        dataToCreate.transaction_status = "pending"
                        dataToCreate.currency = "usd"
                        // dataToCreate.bookingId = options.bookingId
                        dataToCreate.createdAt = new Date()
                        dataToCreate.updatedAt = new Date()

                        const creadedPendingLog = await Transactions.create(dataToCreate).fetch();
                        return response.failed(null, constants.TRANSACTION.ACCOUNT_NOT_CREATED, req, res);
                    }
                }
            } else if (users.group_id && users.group_id != "", users.group_id != null) {
                var find_group = await Users.find({ affiliate_group: users.group_id, isDeleted: false, status: "active", addedBy: req.identity.id });
                if (find_group && find_group.length > 0) {
                    try {
                        for await (var find_user of find_group) {
                            if (find_user && find_user.account_id != undefined && find_user.account_id != "") {

                                if (users.amount_type == "percentage") {

                                    let find_campaign = await Campaign.findOne({ affiliate_id: find_user.id, event_type: event_type, isDeleted: false });

                                    let amt = 0;
                                    if (find_campaign) {
                                        amt = (Number(users.amount) * Number(find_campaign.amount)) / 100;
                                        // amt = users.amount / find_group.length
                                        // console.log(users.amount, "------------users.amount*------------3");

                                        var payout = await stripe.transfers.create({   // Added on 1 Aug 2023, After payout issue, Replacing payout api with transfer api
                                            amount: Math.round(Number(amt) * 100),
                                            currency: "usd",
                                            destination: find_user.account_id,
                                        });

                                        var transactionData = {}
                                        transactionData.amount = amt
                                        transactionData.user_id = req.identity.id
                                        transactionData.paid_to = find_user.id
                                        transactionData.transaction_status = "successful"
                                        transactionData.stripe_charge_id = payout.id
                                        transactionData.transaction_id = payout.id
                                        transactionData.currency = payout.currency
                                        // transactionData.bookingId = options.bookingId
                                        transactionData.transaction_type = "bank_account"
                                        transactionData.createdAt = new Date()
                                        transactionData.updatedAt = new Date()

                                        const createdTransaction = await Transactions.create(transactionData).fetch();
                                        let update_commisson_status = await CommissionsManagement.updateOne({ id: users.commission_id }, { status: "completed" });
                                    } else {
                                        return response.failed(null, `Campaign not created for ${find_user.fullName} ${users.event_type} event`, req, res);
                                    }

                                } else {
                                    let amt = 0;
                                    amt = users.amount / find_group.length
                                    var payout = await stripe.transfers.create({   // Added on 1 Aug 2023, After payout issue, Replacing payout api with transfer api
                                        amount: Math.round(Number(amt) * 100),
                                        currency: "usd",
                                        destination: find_user.account_id,
                                    });
                                    var transactionData = {}
                                    transactionData.amount = amt
                                    transactionData.user_id = req.identity.id
                                    transactionData.paid_to = find_user.id
                                    transactionData.transaction_status = "successful"
                                    transactionData.stripe_charge_id = payout.id
                                    transactionData.transaction_id = payout.id
                                    transactionData.currency = payout.currency
                                    // transactionData.bookingId = options.bookingId
                                    transactionData.transaction_type = "bank_account"
                                    transactionData.createdAt = new Date()
                                    transactionData.updatedAt = new Date()

                                    const createdTransaction = await Transactions.create(transactionData).fetch();
                                    let update_commisson_status = await CommissionsManagement.updateOne({ id: users.commission_id }, { status: "completed" });

                                }
                                // return response.success(createdTransaction, constants.TRANSACTION.SUCCESSFULLY, req, res);
                            } else {

                                dataToCreate = {}
                                dataToCreate.user_id = req.identity.id
                                dataToCreate.paid_to = find_user.id
                                dataToCreate.amount = users.amount
                                dataToCreate.transaction_type = "bank_account"
                                dataToCreate.transaction_status = "failed"
                                dataToCreate.currency = "usd"
                                // dataToCreate.bookingId = options.bookingId
                                dataToCreate.createdAt = new Date()
                                dataToCreate.updatedAt = new Date()

                                const creadedPendingLog = await Transactions.create(dataToCreate).fetch();
                                // console.log(creadedPendingLog, '==============createdTransaction222');

                                return response.failed(null, constants.TRANSACTION.ACCOUNT_NOT_CREATED, req, res);
                            }
                        }
                    } catch (err) {
                        // console.log(req.identity.id, "---------------req.identity.id");
                        // console.log(err, "error is here on transfer")
                        dataToCreate = {}
                        dataToCreate.user_id = req.identity.id
                        dataToCreate.paid_to = find_group.id
                        dataToCreate.amount = users.amount
                        dataToCreate.transaction_type = "bank_account"
                        dataToCreate.transaction_status = "pending"
                        dataToCreate.currency = "usd"
                        // dataToCreate.bookingId = options.bookingId
                        dataToCreate.createdAt = new Date()
                        dataToCreate.updatedAt = new Date()

                        const creadedPendingLog = await Transactions.create(dataToCreate).fetch();
                        // console.log(creadedPendingLog, '==============createdTransaction1111');

                        return response.failed(null, constants.TRANSACTION.ACCOUNT_NOT_CREATED, req, res);
                    }
                }

            } else {

                dataToCreate = {}
                dataToCreate.user_id = req.identity.id
                dataToCreate.paid_to = find_user.id
                dataToCreate.amount = users.amount
                dataToCreate.transaction_type = "bank_account"
                dataToCreate.transaction_status = "failed"
                dataToCreate.currency = "usd"
                // dataToCreate.bookingId = options.bookingId
                dataToCreate.createdAt = new Date()
                dataToCreate.updatedAt = new Date()

                const creadedPendingLog = await Transactions.create(dataToCreate).fetch();
                // console.log(creadedPendingLog, '==============createdTransaction222');

                return response.failed(null, constants.TRANSACTION.ACCOUNT_NOT_CREATED, req, res);
            }

        }
        return response.success(null, constants.TRANSACTION.SUCCESSFULLY, req, res);
    } catch (error) {
        // console.log(error, "errr");
        return response.failed(null, `${error}`, req, res);
    }

}

exports.webhook = async (request, response) => {
    try {
        const event = request.body;
        // Handle the event
        switch (event.type) {
            case 'customer.subscription.updated':
                var event_object = event.data.object;
                if (event_object.status == "active") {
                    let update_subscription = await Subscriptions.updateOne({ stripe_subscription_id: event_object.id }, {
                        valid_upto: new Date(event_object.current_period_end * 1000),
                        status: "active"
                    });
                }
                break;


            case 'invoice.payment_succeeded':
                var event_object = event.data.object;
                // console.log(event_object, "=====event_object");
                if (event_object.subscription) {

                    let get_subscription_data = await Subscriptions.findOne({
                        stripe_subscription_id: event_object.subscription
                    });
                    // console.log(get_subscription_data, "---get_subscription_data");

                    if (get_subscription_data) {
                        let get_subscription_plan = await SubscriptionPlans.findOne({
                            id: get_subscription_data.subscription_plan_id
                        });

                        let transaction_payload = {
                            user_id: get_subscription_data.user_id,
                            paid_to: get_subscription_plan ? get_subscription_plan.addedBy : null,
                            transaction_type: "buy_subscription",
                            subscription_plan_id: get_subscription_plan.id,
                            transaction_id: event_object.id,
                            subscription_id: get_subscription_data.id,
                            stripe_charge_id: event_object.id,
                            currency: event_object.currency,
                            amount: event_object.amount_paid ? event_object.amount_paid / 100 : 0,
                            stripe_subscription_id: event_object.subscription,
                            transaction_status: event_object.status,
                            payment_intent_id: event_object.payment_intent,
                            charge_id: event_object.charge
                        }

                        if (event_object.status == "paid") {
                            transaction_payload.transaction_status = "successful";
                        }

                        // let create_transacton = await Transactions.create(transaction_payload).fetch();
                        // console.log(create_transacton, "---create_transacton");

                        // if (create_transacton) {
                        //     if (create_transacton.transaction_type == "buy_subscription") {

                        //         //----------- update dashboard ----------//
                        //         // let total_subscription_payment = await Services.Dashboard.get_key(create_transacton.user_id, "total_subscription_payment");
                        //         // total_subscription_payment = total_subscription_payment > 0 ? Number(total_subscription_payment) + Number(create_transacton.amount) : Number(create_transacton.amount);
                        //         // let update_dashboard = await Services.Dashboard.update_dashboard(create_transacton.user_id, { total_subscription_payment: total_subscription_payment });
                        //         //----------- update dashboard ----------//

                        //         // let get_plan_added_by = await Users.findOne({ id: get_subscription_plan.addedBy });
                        //         // let get_subscriber = await Users.findOne({ id: get_subscription_data.user_id });
                        //         // let email_payload_to_admin = {
                        //         //     email: get_plan_added_by.email,
                        //         //     subscription_id: get_subscription_data.id,
                        //         //     user_id: get_plan_added_by.id,
                        //         //     subscribed_by: get_subscription_data.user_id,
                        //         //     transaction_id: create_transacton.id
                        //         // }

                        //         // let email_payload_to_user = {
                        //         //     email: get_subscriber.email,
                        //         //     subscription_id: get_subscription_data.id,
                        //         //     user_id: get_subscriber.id,
                        //         //     subscribed_by: get_subscriber.id,
                        //         //     transaction_id: create_transacton.id
                        //         // }

                        //         // await Emails.OnboardingEmails.subscription_transaction_email(email_payload_to_admin);
                        //         // await Emails.OnboardingEmails.subscription_transaction_email(email_payload_to_user);
                        //     }
                        // }
                    }

                }

                break;

            // case 'customer.subscription.created':
            //     var event_object = event.data.object;
            //     console.log(event_object, "event_objectevent_object");

            //     if (event_object) {
            //         let create_subscription_payload = {
            //             user_id: user_id,
            //             // subscription_plan_id: get_subscription_plan.id,
            //             stripe_subscription_id: event_object.id,
            //             addedBy: user_id,
            //             name: get_subscription_plan.name ? get_subscription_plan.name : "",
            //             amount: get_subscription_plan.amount,
            //             interval: get_subscription_plan.interval ? get_subscription_plan.interval : "month",
            //             interval_count: get_subscription_plan.interval_count ? get_subscription_plan.interval_count : 1,
            //             trial_period_days: get_subscription_plan.trial_period_days ? get_subscription_plan.trial_period_days : 0,

            //             valid_upto: new Date(create_subscription.current_period_end * 1000),
            //             trial_period_end_date: new Date(create_subscription.trial_end * 1000),
            //         };

            //         let add_subscription = await Subscriptions.create(create_subscription_payload).fetch();
            //     }
            //     // if (event_object.status == "canceled") {
            //     //     let update_subscription = await Subscriptions.updateOne({ stripe_subscription_id: event_object.id }, {
            //     //         status: "cancelled"
            //     //     });
            //     // }
            //     break;

            case 'customer.subscription.deleted':
                var event_object = event.data.object;
                if (event_object.status == "canceled") {
                    let update_subscription = await Subscriptions.updateOne({ stripe_subscription_id: event_object.id }, {
                        status: "cancelled"
                    });
                }
                break;

            case 'invoice.upcoming':
                var event_object = event.data.object;

                if (event_object.subscription) {

                    let get_subscription_data = await Subscriptions.findOne({
                        stripe_subscription_id: event_object.subscription
                    });


                    if (get_subscription_data) {
                        let get_subscription_plan = await SubscriptionPlans.findOne({
                            id: get_subscription_data.subscription_plan_id
                        });

                        // let get_plan_added_by = await Users.findOne({ id: get_subscription_plan.addedBy });
                        // let get_subscriber = await Users.findOne({ id: get_subscription_data.user_id });
                        // let email_payload_to_admin = {
                        //     email: get_plan_added_by.email,
                        //     subscription_id: get_subscription_data.id,
                        //     user_id: get_plan_added_by.id,
                        //     subscribed_by: get_subscription_data.user_id,
                        //     amount_due: event_object.amount_due
                        // }

                        // let email_payload_to_user = {
                        //     email: get_subscriber.email,
                        //     subscription_id: get_subscription_data.id,
                        //     user_id: get_subscriber.id,
                        //     subscribed_by: get_subscriber.id,
                        //     amount_due: event_object.amount_due,
                        //     period_end: event_object.period_end,
                        // }
                        // await Emails.OnboardingEmails.subscriptiohn_transaction_email(email_payload_to_admin);
                        // await Emails.OnboardingEmails.upcomming_invoice_email(email_payload_to_user);
                    }

                }

                break;

            case 'checkout.session.completed':
                var event_object = event.data.object;
                // console.log(event_object, "event of session checkout complete");
                if (event_object) {

                    let create_subscription_payload = {
                        user_id: event_object.metadata.user_id,
                        subscription_plan_id: event_object.metadata.plan_id,
                        stripe_subscription_id: event_object.subscription,
                        addedBy: event_object.metadata.user_id,
                        name: event_object.metadata.plan_name ? event_object.metadata.plan_name : "",
                        amount: event_object.amount_subtotal,
                        interval: "month",
                        interval_count: event_object.metadata.interval_count ? event_object.metadata.interval_count : 1,
                        trial_period_days: event_object.metadata.trial_period_days ? event_object.metadata.trial_period_days : 0,
                        status: "active"
                        // valid_upto: new Date(create_subscription.current_period_end * 1000),
                        // trial_period_end_date: new Date(create_subscription.trial_end * 1000),
                    };

                    let add_subscription = await Subscriptions.create(create_subscription_payload).fetch();
                    // console.log(add_subscription, "---add_subscription");
                    if (add_subscription) {
                        let update_user = await Users.updateOne(
                            { id: event_object.metadata.user_id },
                            {
                                subscription_id: event_object.subscription,
                                plan_id: event_object.metadata.plan_id,
                                isPayment: true
                            }
                        );
                    }

                    let get_subscription_plan = await SubscriptionPlans.findOne({ id: event_object.metadata.plan_id });
                    let transaction_payload = {
                        user_id: event_object.metadata.user_id,
                        paid_to: get_subscription_plan ? get_subscription_plan.addedBy : null,
                        transaction_type: "buy_subscription",
                        subscription_plan_id: get_subscription_plan.id,
                        transaction_id: event_object.invoice,
                        // subscription_id: event_object.subscription,
                        stripe_charge_id: event_object.invoice,
                        currency: event_object.currency,
                        amount: event_object.amount_subtotal ? event_object.amount_subtotal / 100 : 0,
                        stripe_subscription_id: event_object.subscription,
                        transaction_status: event_object.payment_status
                    }

                    if (event_object.payment_status == "paid") {
                        transaction_payload.transaction_status = "successful";
                    }

                    let create_transacton = await Transactions.create(transaction_payload).fetch();
                }

                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        // Return a response to acknowledge receipt of the event
        response.json({ received: true });

    } catch (error) {
        // console.log(error, '=============error');
    }
}

/**Redirection on stripe */
exports.createCheckoutSession = async (req, res) => {
    try {
        const { plan_id, user_id } = req.body;
        if (plan_id) {
            var get_subscription_plan = await SubscriptionPlans.findOne({ id: plan_id, isDeleted: false, status: "active" });
            if (!get_subscription_plan) {
                throw constants.SUBSCRIPTION_PLAN.INVALID_PLAN;
            }

            if (get_subscription_plan.discount_id && get_subscription_plan.discount_id != null) {
                var get_discount = await Discount.findOne({ id: get_subscription_plan.discount_id, isDeleted: false, status: "active" });
                var discountData = [{
                    coupon: get_discount.stripe_coupon_id ? get_discount.stripe_coupon_id : ''
                }]

            }

        }

        if (user_id) {
            var get_user = await Users.findOne({ id: user_id, isDeleted: false });
        }

        line_items = [{
            'price': get_subscription_plan.stripe_plan_id ? get_subscription_plan.stripe_plan_id : "",
            'quantity': 1,
        }];

        // Create a Checkout Session
        let create_session = await Services.StripeServices.one_time_payment({
            // name: get_product.name,
            // qty: get_variants.quantity,
            // stripe_price_id: get_variants.stripe_price_id,
            discounts: discountData ? discountData : [],
            lineItems: line_items,
            metadata: {
                plan_id: plan_id,
                user_id: user_id,
                plan_name: get_subscription_plan.name,
                interval_count: get_subscription_plan.interval_count ? get_subscription_plan.interval_count : '',
                trial_period_days: get_subscription_plan.trial_period_days ? get_subscription_plan.trial_period_days : ''
            },
            email: get_user.email
        });

        if (create_session) {
            let resData = {
                url: create_session.url
            }
            return response.success(resData, constants.COMMON.SUCCESS, req, res);
        }
    } catch (error) {
        console.log(error, "=============err");
        // Handle errors and respond with an error message
        return res.serverError({
            success: false,
            message: 'Error creating Checkout Session',
        });
    }
}