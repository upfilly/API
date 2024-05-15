const SmtpController = require('../controllers/SmtpController');
const credentials = require('../../config/local');
const Services = require('../services/index');
const moment = require('moment');


exports.AddCampaign = async (options) => {
   let get_affiliate = await Users.findOne({ id: options.affiliate_id })
   let get_brand = await Users.findOne({ id: options.brand_id })
   let email = get_affiliate.email;


   // let name_variable = (await Services.Utils.get_first_letter_from_each_word(get_user ? get_user.fullName : ""));

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
                 <h1 style="  margin-bottom: 0px;  margin-top: 10px; font-size: 18px;"><span style="font-weight: 400;color:#373737;">Hi </span>${await Services.Utils.title_case(get_affiliate.fullName)}, </h1>
                 <p style="margin-top: 0px;    font-size: 14px; color:#373737; margin-bottom: 0;">This is an notification email to let you know about campaign request.
                 </p>
                 </div>
                 </div>
                 </div>
                 <div style="max-width: 308px; margin: auto; padding-bottom: 2rem;">
     <img src="${credentials.BACK_WEB_URL}/images/Daco.png" style="width: 60px;margin-top: 2rem;">
    <p style="margin-bottom: 8px;color: #747474;font-size: 13px;    line-height: 18px; ">You have a new campaign request from <b>${await Services.Utils.title_case(get_brand.fullName)}</b> brand.</p>
    <p style="margin-bottom: 8px;color: #747474;font-size: 13px;    line-height: 18px; ">To get started, Click on below link -`
   for await (let linkObj of options.campaign_link) {
      message += `</br><span style="font-weight: 400;color:#373737;">${await Services.Utils.title_case(linkObj.event_type)}</span> : <a href="${linkObj.event_link}">${linkObj.event_link}</a>`
   }
   `and share it on your social media platforms
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

  
`

   SmtpController.sendEmail(email, 'Campaign Request', message)
};

exports.changeStatus = async (options) => {
   var status = options.status;
   var reason = options.reason;
   var get_affiliate = await Users.findOne({ id: options.affiliate_id })
   var get_brand = await Users.findOne({ id: options.brand_id })
   var email = get_brand.email;

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
                <p style="margin-top: 0px;    font-size: 14px; color:#373737; margin-bottom: 0;">This is an notification email to let you know about campaign request.
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
                      this is an notification email to<br> let you know about campaign request.
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
    padding: 10px 30px; margin - top: 15px; " href="` + credentials.FRONT_WEB_URL + `">Login into your account</a > `
   }
   message += ` </div>
             </div>
          </div>
       </body>
    </html>-->
`

   SmtpController.sendEmail(email, 'Campaign Request', message)
};