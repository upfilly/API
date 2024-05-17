const SmtpController = require('../controllers/SmtpController');
const credentials = require('../../config/local');
const Services = require('../services/index');
const moment = require('moment');


exports.AddCommission = async (options) => {
   let affiliate_name = options.fullName
   let brand_name = options.brand_name
   let email = options.email
   let commission_detail = options.commission_detail
   // let name_variable = (await Services.Utils.get_first_letter_from_each_word(get_user ? get_user.fullName : ""));

   message = '';
   message += `
<head>
    <title>Upfilly</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">

</head>

<body style="font-family: 'Poppins', sans-serif; background : #f3f3f3;">
    <table width="100%" cellpadding: "0" cellspacing="0">
        <tbody>
            <tr>
                <td style="padding: 50px 20px;">
                    <table width="676px" cellpadding: "0" cellspacing="0" style="margin: 0 auto;background:#fff;border-radius: 0px 100px;" class="w-100">
                        <tr>
                            <td style="height: 18px;">

                            </td>
                        </tr>
                        <tr>
                            <td style="text-align:center;padding-bottom: 10px;height: 28px;">
                                <img src="${credentials.BACK_WEB_URL}/images/upfilly.png" style="width: 150px;object-fit: contain;margin: 0 auto;" />
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 60px;">
                                <table width="100%;cellpadding:" 0 " cellspacing="0 " ">
                                    <tr>
                                        <td style="border-bottom: 1px solid 
                            #E2E8F0; ">

                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align:center;">
                                <p style="font-size: 14px;max-width: 400px;margin:0 auto;font-weight: 600;padding: 0 20px;color: #393C3D;line-height: 21px; margin-bottom: 10px;">Hi ${await Services.Utils.title_case(affiliate_name)},
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align:center; padding-bottom: 10px; height: 50px;">
                                <img src="${credentials.BACK_WEB_URL}/images/message.png" style="width: 55px;object-fit: contain;margin: 0 auto;" />
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align:center;">
                                <p style="font-size: 14px;max-width: 400px;margin:0 auto;font-weight: 600;padding: 0 20px;color: #393C3D;line-height: 21px;" class="fz-20">This is an notification email to let you know about commission detail send by ${await Services.Utils.title_case(brand_name)} Brand.</p>
                            </td>
                        </tr>

                        <tr>
                            <td style="max-width: 700px;font-weight: 500;padding: 14px 60px 0px;line-height: 14px;color: #2B2B2B;text-transform: capitalize;font-size: 14px;padding-bottom: 12px;text-align: center;">
                            Please find the Mannual Commission details below:
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 60px;">
                                <table cellpadding="0" cellspacing="0" style="padding: 0px;display: flex;align-items:flex-start;width: 100%;">
                                    <tbody style="
        width: 100%;
    ">
                                        <tr style="display: flex;align-items:flex-start;">
                                            <td style="padding: 0px;display: flex;align-items:flex-start; width: 50%;">
                                                <table cellpadding="0" cellspacing="0" width="100%">
                                                    <tbody>
                                                        <tr>
                                                            <td style="border-top: 1px solid #000; border-bottom: 1px solid #000; border-right: 1px solid #000;  border-left:1px solid #000; padding:8px;font-size: 13px;color: #000;font-weight: 500;text-align: left;">Upload Method:</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="  border-right: 1px solid #000;  border-bottom: 1px solid #000; border-left: 1px solid #000; padding:8px;font-size: 13px;color: #000;font-weight: 500;text-align: left;">Commission Type:</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="  border-right: 1px solid #000;  border-bottom: 1px solid #000; border-left: 1px solid #000; padding:8px;font-size: 13px;color: #000;font-weight: 500;text-align: left;">Publisher ID:</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="  border-right: 1px solid #000;  border-bottom: 1px solid #000; border-left: 1px solid #000; padding:8px;font-size: 13px;color: #000;font-weight: 500;text-align: left;">Account of sale:</td>
                                                        </tr>
                                                        <tr>
                                                            <td style=" border-right: 1px solid #000;  border-bottom: 1px solid #000; border-left: 1px solid #000;padding:8px;font-size: 13px;color: #000;font-weight: 500;text-align: left;">Account of commission:</td>
                                                        </tr>
                                                        <tr>
                                                            <td style=" border-right: 1px solid #000;  border-bottom: 1px solid #000; border-left: 1px solid #000;padding:8px;font-size: 13px;color: #000;font-weight: 500;text-align: left;">Commission Status:</td>
                                                        </tr>
                                                        <tr>
                                                            <td style=" border-right: 1px solid #000;  border-bottom: 1px solid #000; border-left: 1px solid #000;padding:8px;font-size: 13px;color: #000;font-weight: 500;text-align: left;">Order reference:</td>
                                                        </tr>
                                                        <tr>
                                                            <td style=" border-right: 1px solid #000;  border-bottom: 1px solid #000; border-left: 1px solid #000;padding:8px;font-size: 13px;color: #000;font-weight: 500;text-align: left;">Click Ref (IO Number):</td>
                                                        </tr>



                                                    </tbody>
                                                </table>
                                            </td>
                                            <td style="padding: 0px;display: flex;align-items:flex-start; width: 100%;">
                                                <table cellpadding="0" cellspacing="0" width="100%">
                                                    <tbody>
                                                        <tr>
                                                            <td style="border-right: 1px solid #000;  border-top: 1px solid #000; border-bottom: 1px solid #000; padding:  8px;font-size: 13px;text-align: left;font-weight: 500;">
                                                                <span>${await Services.Utils.title_case(commission_detail.upload_method)}</span></td>
                                                        </tr>
                                                        <tr>

                                                            <td style="border-right: 1px solid #000; border-bottom: 1px solid #000;padding: 8px;font-size: 13px;text-align: left;font-weight: 500;"> <span>${await Services.Utils.title_case(commission_detail.commission_type)}</span></td>
                                                        </tr>
                                                        <tr>

                                                            <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 8px;font-size: 13px;text-align: left;font-weight: 500;">
                                                                <span>${commission_detail.publisher_id}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>

                                                            <td style="border-right: 1px solid #000; border-bottom: 1px solid #000;padding: 8px;font-size: 13px;text-align: left;font-weight: 500;">
                                                                <span>${commission_detail.amount_of_sale}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>

                                                            <td style="border-right: 1px solid #000; border-bottom: 1px solid #000;padding: 8px;font-size: 13px;text-align: left;font-weight: 500;">
                                                                <span>${commission_detail.amount_of_commission}</span>
                                                            </td>
                                                        </tr>

                                                        <tr>
                                                            <td style="border-right: 1px solid #000; border-bottom: 1px solid #000;padding: 8px;font-size: 13px;text-align: left;font-weight: 500;">
                                                                <span>${await Services.Utils.title_case(commission_detail.status)}</span>
                                                        </tr>
                                                        <tr>

                                                            <td style="border-right: 1px solid #000; border-bottom: 1px solid #000;padding: 8px;font-size: 13px;text-align: left;font-weight: 500;">
                                                                <span>${await Services.Utils.title_case(commission_detail.order_reference)}<</span>
                                                            </td>
                                                        </tr>
                                                        <tr>

                                                            <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 8px;font-size: 13px;text-align: left;font-weight: 500;">
                                                                <span>${commission_detail.click_ref}</span>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                                </td>
                                        </tr>
                                    </tbody>
                                </table>
                                </td>
                                <tr>

                                   <!-- <td style="padding: 0px 8px;font-size: 13px;text-align: left;font-weight: 500;text-align: center;">
                                        <p style="margin:0px;height: 17px; text-align: center;">
                                            <label for="vehicle1"> Send publisher email and commission details</label>
                                        </p>
                                    </td>-->
                                </tr>

                        </tr>

                        <tr>
                            <td style="padding: 15px 0 25px 0;">
                                <p style="font-size: 13px;max-width: 500px;margin:0 auto;text-align: center;color: #6D6D6D;line-height: 22px;padding: 0 20px;">
                                Please review the information and let me know if there are any further details or documents needed.Thank you for your cooperation.
                                </p>
                            </td>
                        </tr>
                        <!--<tr>
                            <td>
                                <a href="#" style="
                                background: linear-gradient(0deg, #00BAFF 0%, #00BAFF 100%), #FF743C;
                                display:block;
                                color:#fff;
                                padding: 8px 0px;
                                width: 209px;
                                margin: 0 auto 0;
                                box-shadow: none;
                                border: 0;
                                font-size: 13px;
                                text-decoration: none;
                                font-weight: 400;
                                text-align: center;
                                border-radius: 60px;
                                ">Verify your email address</a>
                            </td>
                        </tr>-->
                        <tr>
                            <td style="height: 28px;">

                            </td>
                        </tr>
                    </table>
                    </td>
            </tr>
        </tbody>
    </table>
</body>
  
`

   SmtpController.sendEmail(email, 'Commission Details', message)
};
exports.changeStatus = async (options) => {
   let status = options.status;
   let reason = options.reason;
   let get_affiliate = await Users.findOne({ id: options.affiliate_id })
   let get_brand = await Users.findOne({ id: options.brand_id })
   let email = get_affiliate.email;

   // let name_variable = (await Services.Utils.get_first_letter_from_each_word(get_user ? get_user.fullName : ""));
   let matter;
   if (status == 'rejected') {
      matter = `Regret to inform you that the request you have sent to ${get_affiliate.fullName} is rejected.
        <br><br>
        <b> Reason : </b>${reason} <br><br>Better luck for the next time. Thanks for the business.`
   } else {
      matter = `Congratulations,<br> The request you have sent to ${get_affiliate.fullName} has been accepted. We wish good luck for the future venture. Thanks for your business.`
   }
   message = '';
   message += `

   <body style="font-family: sans-serif;">

   <div style="width:600px;margin: auto;margin-top: 2rem;box-shadow: 0px 0px 20px -15px #000;position: relative;">
       <div style="text-align: center;">
           <div style=" background: url('${credentials.BACK_WEB_URL}/images/banner.png');  background-size: 100% !important;width: 100% !important; height: 260px; ">
           </div>
           <div style="margin-top:-190px !important;">
           <div style=" width: 225px; height: 225px;  box-shadow: 10px 4px 3px 0px #0000000d; padding: 1rem;
           text-align: center;  display: -webkit-flex; border: 5px solid #00BAFF; background: #fff; margin: auto;  border-radius: 50%; display: flex; justify-content: center;align-items: center;">
               <div>
                        <img src="${credentials.BACK_WEB_URL}/images/upfilly.png"style="width:115px; height: 40px; object-fit: contain;">
                <h1 style="  margin-bottom: 0px;  margin-top: 10px; font-size: 18px;"><span style="font-weight: 400;color:#373737;">Hi </span>${get_brand.fullName},</h1>
                <p style="margin-top: 0px;    font-size: 14px; color:#373737; margin-bottom: 0;">This is an notification email to let you know about proposal request.
                </p>
                </div>
                </div>
                </div>
                <div style="max-width: 308px; margin: auto; padding-bottom: 2rem;">
    <img src="${credentials.BACK_WEB_URL}/images/Daco.png" style="width: 60px;margin-top: 2rem;">
   <p style="margin-bottom: 8px;color: #747474;font-size: 13px;    line-height: 18px; ">${matter}</p>
<div style="margin: 2rem 0px;">
<a style="font-size: 12px;    background: #0260A5;
border: none;
color: #fff;
padding: 10px 20px;border-radius: 30px;cursor: pointer;  "href=`+ credentials.FRONT_WEB_URL + `>Login into your account</a>
</div>

<div style="margin-bottom: 2rem;">
  <span  > <img src="${credentials.BACK_WEB_URL}/images/Image1.png"style="width: 40px;"></span>
   <span ><img src="${credentials.BACK_WEB_URL}/images/Image2.png"style="width: 40px;"></span>
       <span ><img src="${credentials.BACK_WEB_URL}/images/Image3.png"style="width: 40px;"></span>
           <span ><img src="${credentials.BACK_WEB_URL}/images/Image4.png"style="width: 40px;"></span>
</div>

           <p style="color: #626262;font-size: 11px;margin-bottom: 0px;">Copyright © 2023</p>
       </div>
       </div>
     
   </div>
</body>


  <!--  <!DOCTYPE html>
    <html lang="en">
       <head>
       </head>
       <body>
          <div>
             <div style="
                width: 600px;
                margin: auto;
                border: 1px solid whitesmoke;
                padding: 25px 25px;">
                <div style="
                   text-align: center;
                   margin-top: 30px;">
                   <img src="${credentials.BACK_WEB_URL}/images/upfilly.png" alt="" style="
                      width: 160px;
                      object-fit: cover;">
                </div>
                <div style="text-align: center; margin-top: 30px;">
                   <p style="
                      color: #000;
                      text-align: center;
                      font-family: sans-serif;
                      font-size: 20px;
                      font-style: normal;
                      font-weight: 100 !important;">Hi <b> ${get_brand.fullName} </b>,<br>
                      this is an notification email to<br> let you know about proposal request.
                   </p>
                </div>
                <div style="text-align: center; 
                   border-radius: 0px 100px;
                   background: rgba(19, 61, 86, 0.07);
                   padding: 33px 24px;margin-top: 35px;">
                   <img style="
                      width: 85px;
                      height: 85px;
                      object-fit: cover;" src="${credentials.BACK_WEB_URL}/images/Daco.png" alt="">
                   <p style="
                      color: #6D6D6D;
                      text-align: center;
                      font-size: 14px;
                      font-family: sans-serif;
                      font-style: normal;
                      font-weight: 300;
                      line-height: 18px;">
                      ${matter}</p>
                      `
   if (status == 'accepted') {
      message += ` <a style = "    border-radius: 60px;
    background: rgba(0, 186, 255, 1);
    border: none;
    color: #FFF;
    text - align: center;
    font - family: sans - serif;
    font - size: 14px;
    font - style: normal;
    font - weight: 200;
    line - height: normal;
    padding: 10px 30px; margin - top: 15px; " href="` + credentials.FRONT_WEB_URL + `">Go to your account</a > `
   }
   message += ` </div>
             </div>
          </div>
       </body>
    </html>-->
`

   SmtpController.sendEmail(email, 'Proposal Request', message)
};