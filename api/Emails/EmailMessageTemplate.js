const SmtpController = require('../controllers/SmtpController');
const credentials = require('../../config/local');
const Services = require('../services/index');
const moment = require('moment');


exports.sendEmailMessageTemplate = async (options) => {
   let brandFullName = options.brandFullName
   let affiliateFullName = options.affiliateFullName
   let affiliateEmail = options.affiliateEmail;
   let emailMessage = options.emailMessage;
    // console.log(options);
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
                <h1 style="  margin-bottom: 0px;  margin-top: 10px; font-size: 18px;"><span style="font-weight: 400;color:#373737;">Hi </span>${affiliateFullName}, </h1>
                <p style="margin-top: 0px;    font-size: 14px; color:#373737; margin-bottom: 0;">  You have an email message from ${brandFullName} kindly check you account
                </p>
                <p>${emailMessage}</p>
                </div>
                </div>
                </div>
                
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
    // console.log("===========+>",affiliateEmail);
   SmtpController.sendEmail(affiliateEmail, 'Recieved Email Message', message)
};