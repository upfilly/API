const SmtpController = require('../controllers/SmtpController');
const credentials = require('../../config/local');
const Services = require('../services/index');
const moment = require('moment');


exports.userVerifyLink = async (options) => {
    let email = options.email
    let get_user = await Users.findOne({ id: options.id })

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
                 <h1 style="  margin-bottom: 0px;  margin-top: 10px; font-size: 18px;"><span style="font-weight: 400;color:#373737;">Hi </span>${await Services.Utils.title_case(get_user.fullName)}, </h1>
                 <p style="margin-top: 0px;    font-size: 14px; color:#373737; margin-bottom: 0;">Just a friendly reminder to verify your email address.
                 </p>
                 </div>
                 </div>
                 </div>
                 <div style="max-width: 308px; margin: auto; padding-bottom: 2rem;">
     <img src="${credentials.BACK_WEB_URL}/images/Daco.png" style="width: 60px;margin-top: 2rem;">
    <p style="margin-bottom: 8px;color: #747474;font-size: 13px;    line-height: 18px; ">Thanks for Signing Up at Upfilly, This is an notification email to verify your account by clicking
        the button below.</p>
<div style="margin: 2rem 0px;">
<a style="font-size: 12px;    background: #0260A5;
border: none;
color: #fff;
padding: 10px 20px;border-radius: 30px;cursor: pointer;  "href=`+ credentials.BACK_WEB_URL + "/verifyUser?id=" + options.id + `>Verify email address</a>
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

    SmtpController.sendEmail(email, 'Email Verification', message)
};

exports.forgotPasswordEmail = async (options) => {
    let email = options.email;
    let verificationCode = options.verificationCode;
    let fullName = options.fullName;

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
                 <h1 style="  margin-bottom: 0px;  margin-top: 10px; font-size: 18px;"><span style="font-weight: 400;color:#373737;">Hi </span>${fullName}, </h1>
                 <p style="margin-top: 0px;    font-size: 14px; color:#373737; margin-bottom: 0;">
                 </p>
                 </div>
                 </div>
                 </div>
                 <div style="max-width: 308px; margin: auto; padding-bottom: 2rem;">
     <img src="${credentials.BACK_WEB_URL}/images/Daco.png" style="width: 60px;margin-top: 2rem;">
    <p style="margin-bottom: 8px;color: #747474;font-size: 13px;    line-height: 18px; ">Your verification code is:<b> ${verificationCode}</b></p>
<div style="margin: 2rem 0px;">
<!--<a style="font-size: 12px;    background: #0260A5;
border: none;
color: #fff;
padding: 10px 20px;border-radius: 30px;cursor: pointer;  "href=`+ credentials.BACK_WEB_URL + "/verifyUser?id=" + options.id + `>Verify email address</a>-->
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

<!--<!DOCTYPE html>
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
                    font-weight: 100 !important;">Hi <b>${fullName}</b>,<br>
                    We have received your request to reset your password.
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
        line-height: 18px;">Your verification code is: ${verificationCode}</p>
              
    </div>
    
    
    
    
            </div>
        </div>
    </body>
    </html>--> 
    `
    SmtpController.sendEmail(email, 'Reset Password', message);
};

exports.update_password_by_admin = async (options) => {
    let email = options.email;
    let fullName = options.fullName;
    let updated_password = options.updated_password;
    // let get_user = await Users.findOne({ id: options.user_id })

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
                 <h1 style="  margin-bottom: 0px;  margin-top: 10px; font-size: 18px;"><span style="font-weight: 400;color:#373737;">Hi </span>${fullName}, </h1>
                 <p style="margin-top: 0px;    font-size: 14px; color:#373737; margin-bottom: 0;">This is an notification email to let you know about
                 Your password is updated by admin. Please use below updated password for your login.
                 </p>
                 </div>
                 </div>
                 </div>
                 <div style="max-width: 308px; margin: auto; padding-bottom: 2rem;">
     <img src="${credentials.BACK_WEB_URL}/images/Daco.png" style="width: 60px;margin-top: 2rem;">
    <p style="margin-bottom: 8px;color: #747474;font-size: 13px;    line-height: 18px; ">Your updated password is <b>${updated_password}</b></p>
<div style="margin: 2rem 0px;">
<!--<a style="font-size: 12px;    background: #0260A5;
border: none;
color: #fff;
padding: 10px 20px;border-radius: 30px;cursor: pointer;  "href=`+ credentials.BACK_WEB_URL + "/verifyUser?id=" + options.id + `>Login into your account</a>-->
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






   <!-- <!DOCTYPE html>
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
                    font-weight: 100 !important;">Hi <b>${fullName}</b>,<br>
                    this is an notification email to let you know about
                    Your password is updated by admin. Please use below updated password for your login.
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
        <div style="text-align: center;">
        <div style="padding: 15px; border:3px solid rgb(64, 163, 201); border-radius: 8px; max-width: 356px;  color: #2759A7; margin-left: auto; margin-right:auto; box-shadow: 0px 0px 8px 0px #8080808a;">
        Your updated password is <b>${updated_password}</b>
      </div>
    </div>    
            </div>
        </div>
    </body>
    </html>-->
  `

    SmtpController.sendEmail(email, 'Update Password Notification', message);
};

exports.add_user_email = async (options) => {
    let email = options.email;
    // let firstName = options.firstName;
    let fullName = options.fullName;
    let password = options.password;
    let get_user = await Users.findOne({ id: options.added_by })
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
                 <h1 style="  margin-bottom: 0px;  margin-top: 10px; font-size: 18px;"><span style="font-weight: 400;color:#373737;">Hi </span>${fullName}, </h1>
                 <p style="margin-top: 0px;    font-size: 14px; color:#373737; margin-bottom: 0;">You are added by <b>`+ get_user.fullName + `</b> Please check your login credentials below
                 </p>
                 </div>
                 </div>
                 </div>
                 <div style="max-width: 308px; margin: auto; padding-bottom: 2rem;">
     <img src="${credentials.BACK_WEB_URL}/images/Daco.png" style="width: 60px;margin-top: 2rem;">
    <p style="margin-bottom: 8px;color: #747474;font-size: 13px;    line-height: 18px; ">Your email is <b>`+ email + `</b><br><br>Your password is <b>` + password + `</b></p>
<div style="margin: 2rem 0px;">
<a style="font-size: 12px;    background: #0260A5;
border: none;
color: #fff;
padding: 10px 20px;border-radius: 30px;cursor: pointer;  "href=`+ credentials.BACK_WEB_URL + "/verifyUser?id=" + options.id + `>Login into your account</a>
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
    SmtpController.sendEmail(email, 'Registration', message);
};

exports.notification_to_partnerManager = async (options) => {
    let email = options.email;
    // let firstName = options.firstName;
    let affiliate_firstName = options.affiliate_firstName;
    let affiliate_fullName = options.affiliate_fullName;
    let partner_firstName = options.partner_firstName;
    let partner_fullName = options.partner_fullName;
    let createdBy_brand = options.createdBy_brand
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
                 <h1 style="  margin-bottom: 0px;  margin-top: 10px; font-size: 18px;"><span style="font-weight: 400;color:#373737;">Hi </span>${await Services.Utils.title_case(partner_fullName)}, </h1>
                 <p style="margin-top: 0px;    font-size: 14px; color:#373737; margin-bottom: 0;">This is notification email to let you know about affliate account creation.
                 </p>
                 </div>
                 </div>
                 </div>
                 <div style="max-width: 308px; margin: auto; padding-bottom: 2rem;">
     <img src="${credentials.BACK_WEB_URL}/images/Daco.png" style="width: 60px;margin-top: 2rem;">
    <p style="margin-bottom: 8px;color: #747474;font-size: 13px;    line-height: 18px; "><b>${await Services.Utils.title_case(affiliate_fullName)}</b> is added by <b>${await Services.Utils.title_case(createdBy_brand)}</b></p>
<div style="margin: 2rem 0px;">

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
    SmtpController.sendEmail(email, 'Affiliate account creation', message);
};

exports.send_verification_code = async (options) => {
    // console.log(options, "---options");
    let email = options.email
    let get_user = await Users.findOne({ id: options.id })
    let { verificationCode } = options;
    let name_variable = await Services.Utils.get_first_letter_from_each_word(get_user ? get_user.fullName : "");

    message = '';

    message += `

    <!DOCTYPE html>
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
                      font-weight: 100 !important;"> Hi ${get_user.fullName}, <br />Just a friendly reminder to <br />verify your email address.,<br>
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
                      line-height: 18px;">Your verification code is <b>${verificationCode}</b></p>ultra
                </div>
             </div>
          </div>
       </body>
    </html>
`

    SmtpController.sendEmail(email, 'Email Verification', message)
};

exports.send_verification_code_for_mobile = async (options) => {
    let email = options.email
    let get_user = await Users.findOne({ id: options.id })
    let { verificationCode } = options;
    let name_variable = await Services.Utils.get_first_letter_from_each_word(get_user ? get_user.fullName : "");

    message = '';

    message += `
<div class="email" style="display: flex; height:auto;">
    <div class="main" style="height:100%; width:600px;  margin: auto;  border-radius:0px; border: 1px solid #ececec;" >
        <div class="email" style="width:100%; height:fit-content; position: relative;" >
            <div class="upper_section" style=" padding: 0rem; border-radius: 0px 0px 10px 10px;">
                <div class="update_image" style="text-align: center;">
                    <img src="${credentials.BACK_WEB_URL}/images/frame.png" style="width: 200px; height:200px;"/>
                </div>
            </div>
            <div style=" height: auto ; border-radius: 12px; width: 100%;">
                <h3 class="haedings" style="color: #000; font-size: 35px; text-align: center; width: 100%; margin: auto;">
                    Hi ${get_user.fullName}, <br />Just a friendly reminder to <br />verify your phone number.
                </h3> 
                <div class="profile" style="margin-top:3rem; text-align: center;">
                    <img src="${credentials.BACK_WEB_URL}/images/green_check_mark.png" style="width: 100px; height:100px">
                </div>
                <div style="text-align: center; margin: 3rem 0rem 0rem 0rem; "> 
                    <h2 style="margin-top: 0px; margin-bottom: 30px; color: #000000;"><b>${verificationCode}</b></h2>   
                    <a href="${credentials.FRONT_WEB_URL}/home}" class="btn btn-primary" style="padding: 15px 36px 15px 36px; margin-bottom: 2rem; background: #42047E; border: none; height: 50px; width: 300px; border-radius: 40px; font-size: 17px; font-weight: 600; color: #07F49E;">
                        Open Trenville >
                    </a>
                    <p class="about" style="padding-top: 3rem; font-size: 18px; font-weight: 200; text-align: center;width: 100%; max-width: 500px; margin: auto;">
                        *For security reasons, please help us by verifying your
                        email address.
                    </p>
                </div>
            </div>
            <div class="culture_reach" style="padding: 0rem; width:100%;">
                <div style="text-align: center;margin-top: 2rem;">
                    <p style="font-weight: 400;font-size: 20px;margin-bottom: 5px;">Made by Trenville Team</p>
                    <a style="font-weight: 100;font-size: 20px; text-decoration:none; color:#000" href="www.trenville.com">www.trenville.com</a>
                </div>
            </div>
        </div>
    </div>
</div>
`

    SmtpController.sendEmail(email, 'Phone Verification', message)
};


exports.edit_website_email = async (options) => {
    let email = options.email;

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
                 <h1 style="  margin-bottom: 0px;  margin-top: 10px; font-size: 18px;"><span style="font-weight: 400;color:#373737;">Congratulations</h1>
                 <p style="margin-top: 0px;    font-size: 14px; color:#373737; margin-bottom: 0;">
                 </p>
                 </div>
                 </div>
                 </div>
                 <div style="max-width: 308px; margin: auto; padding-bottom: 2rem;">
     <img src="${credentials.BACK_WEB_URL}/images/Daco.png" style="width: 60px;margin-top: 2rem;">
    <p style="margin-bottom: 8px;color: #747474;font-size: 13px;    line-height: 18px; "><b>Your email is verified and set as a website email.</b></p>
<div style="margin: 2rem 0px;">
<a style="font-size: 12px;    background: #0260A5;
border: none;
color: #fff;
padding: 10px 20px;border-radius: 30px;cursor: pointer;  "href=`+ credentials.BACK_WEB_URL + "/verifyUser?id=" + options.id + `>Login into your account</a>
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

<!--<!DOCTYPE html>
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
                font-size: 26px;
                font-style: normal;
                font-weight: bolder;">Congratulations<br>
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
    line-height: 18px;">Your email is verified and set as a website email.</p>
</div>
        </div>
    </div>
</body>
</html>-->
`
    SmtpController.sendEmail(email, 'Website Email', message);
};


exports.subscribe_email_old = async (options) => {
    let email = options.email;
    let panel_url;
    let heading;
    let content;

    let subscribed_by_details = await Users.findOne({ id: options.subscribed_by });
    let features = [];
    let get_subscription_details = await Subscriptions.findOne({ id: options.subscription_id });
    let get_user_details = await Users.findOne({ id: options.user_id });
    let name_variable = (await Services.Utils.get_first_letter_from_each_word(subscribed_by_details ? subscribed_by_details.fullName : ""));

    if (get_user_details.role == "admin") {
        panel_url = `${credentials.ADMIN_WEB_URL}`;
        heading = `Subscribed`;
        content = `${subscribed_by_details.fullName} subscribed ${get_subscription_details.name} plan`;
    } else {
        panel_url = `${credentials.FRONT_WEB_URL}`;
        heading = `Thank you for your purchase!`;
        content = `Dear ${subscribed_by_details.fullName}, Thanks for your purchase our package or subscription.
        We hope you had a good experience. Below are the features which you 
        got in your package or subscription.You are going to love it here!`
    }

    if (get_subscription_details.social_media_platform) {
        features.push(`View and Analyze influencers from ${get_subscription_details.social_media_platform_count} Social Platforms of your choice`);
    }

    if (get_subscription_details.profile_analyse) {
        features.push(`View and Analyze ${get_subscription_details.profile_analyse_count} Profiles`);
    }

    if (get_subscription_details.messaging_outreach) {
        features.push("Influencer Outreach & Messaging");
    }

    if (get_subscription_details.email_outreach) {
        features.push("Email Outreach");
    }

    if (get_subscription_details.contract) {
        features.push("Start Contract");
    }

    if (get_subscription_details.campaign_management) {
        features.push("Campaign Management");
    }

    if (get_subscription_details.members_invite) {
        features.push(`Invite ${get_subscription_details.members_invite_count} Team Members`);
    }

    if (get_subscription_details.chat_support) {
        features.push("Chat Support");
    }

    if (get_subscription_details.priority_hour_support) {
        features.push("Priority Hour Support");
    }

    if (get_subscription_details.account_management) {
        features.push("Dedicated Account Management");
    }

    if (get_subscription_details.multicultural_creative_strategist) {
        features.push("Muticultural Creative Strategist to help with Campaign planning");
    }
    // console.log(features, '===========features');

    message = '';
    message += `
    <div class="email" style="display: flex; height:auto;">
        <div class="main" style="height:100%;width:900px; margin: auto; padding: 1rem;" >
            <div class="iamges_logo">
                <img src="${credentials.BACK_WEB_URL}/images/logo.png" style="width: 200px; height:auto; margin-left: 15px;"/>
            </div>
            <div class="email" style="width: 800px; height:fit-content;padding: 20px; position: relative;">
                <h2 class="heading" style="font-size:40px; font-weight:600; margin-top: 0px;">Subscription</h2>
                <p style="font-size: 18px; font-weight: 400;">${heading}</p>
                <p style="font-size: 18px; font-weight: 400; line-height: 28px;">
                    ${content}
                </p>
                <div style="border: 1px solid #000; height: auto ; padding: 2rem; border-radius: 12px; width: 100%;">
                    <div class="check-mark " style="width: 100px; height: 100px; border-radius: 50%; background: #FFDD55; color: #CBA200; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 600; margin: auto;">
                        ${name_variable}
                    </div>
                    <div class="center2">
                        <h4 class="below" style=" font-size: 35px; font-family: sans-serif; font-weight: 600;  text-align: center; color: #000000;    margin-bottom: 0px;">
                            ${await Services.Utils.title_case(subscribed_by_details.fullName)}
                        </h4>
                        <p class="below" style=" font-size: 27px; font-family: sans-serif; font-weight: 300;  text-align: center; color: #000000;margin-top: 10px;">
                            ${get_subscription_details.name} <b> $${get_subscription_details.amount}</b> Per month
                        </p>
                        <p class="below" style=" font-size:16px; font-family: sans-serif; font-weight: 600;  text-align: center; color: #000000;margin-top:0px; margin-bottom:10px;">
                            Free 7 Days Trial
                        </p>
                    </div>


                    <div class="profile" style="margin: 2rem 0px;">
                        <div class="profile_detail" style="display: flex; margin: 2rem 0px 0px 0px; flex-wrap: wrap; width: 100%;"> 
                    `
    if (features && features.length > 0) {
        for await (let feature of features) {
            message += `
                        <div class="name_section" style="border: 1px solid #0500C7; width: 22%; display:flex;align-items:center; -webkit-justify-content: center !important;  padding: 20px; border-radius: 10px; margin:20px;">
                            <p class="influencer" style="font-size: 16px; margin-bottom:10px;"> ${feature}</p>
                        </div>`
        }
    }

    message += `</div>
                </div>
            </div>

            <p style="font-weight: 400; font-size: 16px; line-height:30px; color: #000; text-alignborder: 1px solid #000; height: auto ; padding: 0rem; border-radius: 12px; width: 100%;: center; position: relative; top: 0px;text-align: left;">
                If you have any questions as you’re getting started, drop us a note <a style="text-decoration:none; color: #000;" href="mailto:help@culturereach.com">help@culturereach.com</a>. We’re glad you’re here!
            </p>
            <div class="culture_reach">
                <div style="text-align: center;margin-top: 2rem;">
                    <img src="${credentials.BACK_WEB_URL}/images/short_logo.png" alt="" style=" margin-bottom: 10px; width: 65px;">
                    <p style="font-weight: 400;font-size: 20px;margin-bottom: 5px;">Made by CultureReach Team</p>
                    <a style="font-weight: 100;font-size: 16px; text-decoration:none;" href="www.culturereach.com">www.culturereach.com</a>
                </div>
            </div>
        </div>
    </div>
</div>
`

    SmtpController.sendEmail(email, 'Subscription', message);
};

exports.subscribe_email = async (options) => {
    let email = options.email;
    let heading;
    let content;

    let subscribed_by_details = await Users.findOne({ id: options.subscribed_by });

    let get_subscription_details = await Subscriptions.findOne({ id: options.subscription_id });
    let get_user_details = await Users.findOne({ id: options.user_id });
    // let name_variable = (await Services.Utils.get_first_letter_from_each_word(subscribed_by_details ? subscribed_by_details.fullName : ""));

    if (get_user_details.role == "admin") {
        panel_url = `${credentials.ADMIN_WEB_URL}`;
        heading = `Subscribed`;
        content = `${subscribed_by_details.fullName} subscribed ${get_subscription_details.name} plan`;
    } else {
        panel_url = `${credentials.FRONT_WEB_URL}`;
        heading = `Thank you for your purchase!`;
        content = `Dear ${subscribed_by_details.fullName}, Thanks for your purchase our package or subscription.
        We hope you had a good experience. Below are the features which you 
        got in your package or subscription.You are going to love it here!`
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
                 <!--<h1 style="  margin-bottom: 0px;  margin-top: 10px; font-size: 18px;"><span style="font-weight: 400;color:#373737;">Hi </span>${get_user_details.fullName}, </h1>-->
                 <p style="margin-top: 0px;    font-size: 14px; color:#373737; margin-bottom: 0;"> ${heading}
                 </p>
                 </div>
                 </div>
                 </div>
                 <div style="max-width: 308px; margin: auto; padding-bottom: 2rem;">
     <img src="${credentials.BACK_WEB_URL}/images/Daco.png" style="width: 60px;margin-top: 2rem;">
    <p style="margin-bottom: 8px;color: #747474;font-size: 13px;    line-height: 18px; ">${content}</p>
<div style="margin: 2rem 0px;">
<a style="font-size: 12px;    background: #0260A5;
border: none;
color: #fff;
padding: 10px 20px;border-radius: 30px;cursor: pointer;  "href=`+ credentials.FRONT_WEB_URL + `>Login into you account</a>
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
    SmtpController.sendEmail(email, 'Subscription', message);
};

exports.subscription_canncelled_old = async (options) => {
    let email = options.email;
    let panel_url;
    let heading;
    let content;

    let subscribed_by_details = await Users.findOne({ id: options.subscribed_by });
    let name_variable = (await Services.Utils.get_first_letter_from_each_word(subscribed_by_details ? subscribed_by_details.fullName : ""));
    let features = [];

    let get_subscription_details = await Subscriptions.findOne({ id: options.subscription_id });

    let get_user_details = await Users.findOne({ id: options.user_id });
    if (get_user_details.role == "admin") {
        panel_url = `${credentials.ADMIN_WEB_URL} `;
        heading = `Unsubscribed`;
        content = `${subscribed_by_details.fullName} unsubscribed ${get_subscription_details.name} plan`;
    } else {
        panel_url = `${credentials.FRONT_WEB_URL} `;
        heading = `You've unsubscribed your package!`;
        content = `Hi ${subscribed_by_details.fullName}, Sorry to see you've unsubscribed our package or subscription.
        We hope you had a good experience. Below are the features which was
        in your package or subscription.`
    }
    if (get_subscription_details.social_media_platform) {
        features.push(`View and Analyze influencers from ${get_subscription_details.social_media_platform_count} Social Platforms of your choice`);
    }

    if (get_subscription_details.profile_analyse) {
        features.push(`View and Analyze ${get_subscription_details.profile_analyse_count} Profiles`);
    }

    if (get_subscription_details.messaging_outreach) {
        features.push("Influencer Outreach & Messaging");
    }

    if (get_subscription_details.email_outreach) {
        features.push("Email Outreach");
    }

    if (get_subscription_details.contract) {
        features.push("Start Contract");
    }

    if (get_subscription_details.campaign_management) {
        features.push("Campaign Management");
    }


    if (get_subscription_details.members_invite) {
        features.push(`Invite ${get_subscription_details.members_invite_count} Team Members`);
    }

    if (get_subscription_details.chat_support) {
        features.push("Chat Support");
    }

    if (get_subscription_details.priority_hour_support) {
        features.push("Priority Hour Support");
    }

    if (get_subscription_details.account_management) {
        features.push("Dedicated Account Management");
    }

    if (get_subscription_details.multicultural_creative_strategist) {
        features.push("Muticultural Creative Strategist to help with Campaign planning");
    }
    // console.log(features,'===========features');

    let message = "";
    message += `
    <div class="email" style="display: flex; height:auto;">
        <div class="main" style="height:100%;width:900px; margin: auto; padding: 1rem;" >
            <div class="iamges_logo">
                <img src="${credentials.BACK_WEB_URL}/images/logo.png" style="width: 200px; height:auto; margin-left: 15px;"/>
            </div>
            <div class="email" style="width: 800px; height:fit-content;padding: 20px; position: relative;">
                <h2 class="heading" style="font-size:40px; font-weight:600; margin-top: 0px;">Subscription Cancelled</h2>
                <p style="font-size: 18px; font-weight: 400;">${heading}</p>
                <p style="font-size: 18px; font-weight: 400; line-height: 28px;">
                    ${content}
                </p>
                <div style="border: 1px solid #000; height: auto ; padding: 2rem; border-radius: 12px; width: 100%;">
                    <div class="check-mark " style="width: 100px; height: 100px; border-radius: 50%; background: #FFDD55; color: #CBA200; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 600; margin: auto;">
                        ${name_variable}
                    </div>
                    <div class="center2">
                        <h4 class="below" style=" font-size: 35px; font-family: sans-serif; font-weight: 600;  text-align: center; color: #000000;    margin-bottom: 0px;">
                            ${await Services.Utils.title_case(subscribed_by_details.fullName)}
                        </h4>
                        <p class="below" style=" font-size: 27px; font-family: sans-serif; font-weight: 300;  text-align: center; color: #000000;margin-top: 10px;">
                            ${get_subscription_details.name} <b> $${get_subscription_details.amount}</b> Per month
                        </p>
                    </div>


                    <div class="profile" style="margin: 2rem 0px;">
                        <div class="profile_detail" style="display: flex; margin: 2rem 0px 0px 0px; flex-wrap: wrap; width: 100%;"> 
                    `
    if (features && features.length > 0) {
        for await (let feature of features) {
            message += `
                        <div class="name_section" style="border: 1px solid #0500C7; width: 22%; display:flex;align-items:center; -webkit-justify-content: center !important;  padding: 20px; border-radius: 10px; margin:20px;">
                            <p class="influencer" style="font-size: 16px; margin-bottom:10px;"> ${feature}</p>
                        </div>`
        }
    }

    message += `</div>
                </div>
            </div>

            <p style="font-weight: 400; font-size: 16px; line-height:30px; color: #000; text-alignborder: 1px solid #000; height: auto ; padding: 0rem; border-radius: 12px; width: 100%;: center; position: relative; top: 0px;text-align: left;">
                If you have any questions as you’re getting started, drop us a note <a style="text-decoration:none; color: #000;" href="mailto:help@culturereach.com">help@culturereach.com</a>. We’re glad you’re here!
            </p>
            <div class="culture_reach">
                <div style="text-align: center;margin-top: 2rem;">
                    <img src="${credentials.BACK_WEB_URL}/images/short_logo.png" alt="" style=" margin-bottom: 10px; width: 65px;">
                    <p style="font-weight: 400;font-size: 20px;margin-bottom: 5px;">Made by CultureReach Team</p>
                    <a style="font-weight: 100;font-size: 16px; text-decoration:none;" href="www.culturereach.com">www.culturereach.com</a>
                </div>
            </div>
        </div>
    </div>
</div>
`

    SmtpController.sendEmail(email, 'Subscription Cancelled', message);
};

exports.subscription_canncelled = async (options) => {
    let email = options.email;
    let panel_url;
    let heading;
    let content;

    let subscribed_by_details = await Users.findOne({ id: options.subscribed_by });
    let name_variable = (await Services.Utils.get_first_letter_from_each_word(subscribed_by_details ? subscribed_by_details.fullName : ""));
    let features = [];

    let get_subscription_details = await Subscriptions.findOne({ id: options.subscription_id });

    let get_user_details = await Users.findOne({ id: options.user_id });
    if (get_user_details.role == "admin") {
        panel_url = `${credentials.ADMIN_WEB_URL} `;
        heading = `Unsubscribed`;
        content = `${subscribed_by_details.fullName} unsubscribed ${get_subscription_details.name} plan`;
    } else {
        panel_url = `${credentials.FRONT_WEB_URL} `;
        heading = `You've unsubscribed your package!`;
        content = `Hi ${subscribed_by_details.fullName}, Sorry to see you've unsubscribed our package or subscription.
        We hope you had a good experience. Below are the features which was
        in your package or subscription.`
    }
    if (get_subscription_details.social_media_platform) {
        features.push(`View and Analyze influencers from ${get_subscription_details.social_media_platform_count} Social Platforms of your choice`);
    }

    if (get_subscription_details.profile_analyse) {
        features.push(`View and Analyze ${get_subscription_details.profile_analyse_count} Profiles`);
    }

    if (get_subscription_details.messaging_outreach) {
        features.push("Influencer Outreach & Messaging");
    }

    if (get_subscription_details.email_outreach) {
        features.push("Email Outreach");
    }

    if (get_subscription_details.contract) {
        features.push("Start Contract");
    }

    if (get_subscription_details.campaign_management) {
        features.push("Campaign Management");
    }


    if (get_subscription_details.members_invite) {
        features.push(`Invite ${get_subscription_details.members_invite_count} Team Members`);
    }

    if (get_subscription_details.chat_support) {
        features.push("Chat Support");
    }

    if (get_subscription_details.priority_hour_support) {
        features.push("Priority Hour Support");
    }

    if (get_subscription_details.account_management) {
        features.push("Dedicated Account Management");
    }

    if (get_subscription_details.multicultural_creative_strategist) {
        features.push("Muticultural Creative Strategist to help with Campaign planning");
    }
    // console.log(features,'===========features');

    let message = "";
    //     message += `
    //     <div class="email" style="display: flex; height:auto;">
    //         <div class="main" style="height:100%;width:900px; margin: auto; padding: 1rem;" >
    //             <div class="iamges_logo">
    //                 <img src="${credentials.BACK_WEB_URL}/images/logo.png" style="width: 200px; height:auto; margin-left: 15px;"/>
    //             </div>
    //             <div class="email" style="width: 800px; height:fit-content;padding: 20px; position: relative;">
    //                 <h2 class="heading" style="font-size:40px; font-weight:600; margin-top: 0px;">Subscription Cancelled</h2>
    //                 <p style="font-size: 18px; font-weight: 400;">${heading}</p>
    //                 <p style="font-size: 18px; font-weight: 400; line-height: 28px;">
    //                     ${content}
    //                 </p>
    //                 <div style="border: 1px solid #000; height: auto ; padding: 2rem; border-radius: 12px; width: 100%;">
    //                     <div class="check-mark " style="width: 100px; height: 100px; border-radius: 50%; background: #FFDD55; color: #CBA200; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 600; margin: auto;">
    //                         ${name_variable}
    //                     </div>
    //                     <div class="center2">
    //                         <h4 class="below" style=" font-size: 35px; font-family: sans-serif; font-weight: 600;  text-align: center; color: #000000;    margin-bottom: 0px;">
    //                             ${await Services.Utils.title_case(subscribed_by_details.fullName)}
    //                         </h4>
    //                         <p class="below" style=" font-size: 27px; font-family: sans-serif; font-weight: 300;  text-align: center; color: #000000;margin-top: 10px;">
    //                             ${get_subscription_details.name} <b> $${get_subscription_details.amount}</b> Per month
    //                         </p>
    //                     </div>


    //                     <div class="profile" style="margin: 2rem 0px;">
    //                         <div class="profile_detail" style="display: flex; margin: 2rem 0px 0px 0px; flex-wrap: wrap; width: 100%;"> 
    //                     `
    //     if (features && features.length > 0) {
    //         for await (let feature of features) {
    //             message += `
    //                         <div class="name_section" style="border: 1px solid #0500C7; width: 22%; display:flex;align-items:center; -webkit-justify-content: center !important;  padding: 20px; border-radius: 10px; margin:20px;">
    //                             <p class="influencer" style="font-size: 16px; margin-bottom:10px;"> ${feature}</p>
    //                         </div>`
    //         }
    //     }

    //     message += `</div>
    //                 </div>
    //             </div>

    //             <p style="font-weight: 400; font-size: 16px; line-height:30px; color: #000; text-alignborder: 1px solid #000; height: auto ; padding: 0rem; border-radius: 12px; width: 100%;: center; position: relative; top: 0px;text-align: left;">
    //                 If you have any questions as you’re getting started, drop us a note <a style="text-decoration:none; color: #000;" href="mailto:help@culturereach.com">help@culturereach.com</a>. We’re glad you’re here!
    //             </p>
    //             <div class="culture_reach">
    //                 <div style="text-align: center;margin-top: 2rem;">
    //                     <img src="${credentials.BACK_WEB_URL}/images/short_logo.png" alt="" style=" margin-bottom: 10px; width: 65px;">
    //                     <p style="font-weight: 400;font-size: 20px;margin-bottom: 5px;">Made by CultureReach Team</p>
    //                     <a style="font-weight: 100;font-size: 16px; text-decoration:none;" href="www.culturereach.com">www.culturereach.com</a>
    //                 </div>
    //             </div>
    //         </div>
    //     </div>
    // </div>
    // `


    message += `
<div class="email" style="display: flex; height:auto;">
    <div class="main" style="  height:100%;width:900px;  margin: auto;  border-radius:0px; border: 1px solid #ececec;" >
        <div class="email" style="width:100%; height:fit-content; position: relative;">
            <div class="upper_section" style="background: #002ed3; padding: 4rem; border-radius: 0px 0px 10px 10px;">
                <h2 class="heading" style="font-size:40px; font-weight:600; margin-top: 0px; color: #fff;">
                    Subscription Cancelled
                </h2>
                <p style="font-size: 21px;color: #fff;font-weight: 400;">
                    ${heading}
                </p>
                <p style="font-size: 21px; font-weight: 400; line-height: 28px; color: #fff;">
                    ${content}
                </p>
                <div class="update_image" style="text-align: center;">
                    <img src="${credentials.BACK_WEB_URL}/images/character.png" style="width: 600px; height:400px;"/>
                </div>
            </div>

            <div style=" height: auto ; padding: 2rem; border-radius: 12px; width: 100%;">
                <div class="profile" style="margin: 2rem 0px;">
                    <div class="profile_detail"  style="   display: flex; margin: 2rem 0px 0px 0px; flex-wrap: wrap; width: 100%;">`

    if (features && features.length > 0) {
        for await (let feature of features) {
            message += `
                        <div class="name_section" style="border: 1px solid #0500C7; width: 22%; text-align: center; padding: 20px; border-radius: 10px; margin:20px; color: #fff; background-color: #0500C7; ">
                            <p class="influencer" style="font-size: 16px; margin-bottom:10px;"> ${feature}</p>
                        </div>`

        }
    }

    message += `        </div >
                </div>
            </div>

            <p style="font-weight: 400; font-size: 24px; line-height: 24px; color: #000; text-align: center; position: relative; top: 25px;">
                If you have any questions as you’re getting started, drop us a note <a style="text-decoration:none; color: #000;" href="mailto:help@culturereach.com">help@culturereach.com</a>. We’re glad you’re here!
            </p>

            <div class="culture_reach">
                <div style="text-align: center;margin-top: 2rem;">
                    <img src="${credentials.BACK_WEB_URL}/images/short_logo.png" alt="" style=" margin-bottom: 10px; width: 65px;">
                    <p style="font-weight: 400;font-size: 20px;margin-bottom: 5px;">Made by CultureReach Team</p>
                    <a style="font-weight: 100;font-size: 20px; text-decoration:none; color:#000" href="www.culturereach.com">www.culturereach.com</a>
                </div>
            </div>
        </div >
    </div >
</div >
    `

    SmtpController.sendEmail(email, 'Subscription Cancelled', message);
};

exports.trial_will_end_email_old = async (options) => {
    let email = options.email;
    let panel_url;
    let heading;
    let content;

    let subscribed_by_details = await Users.findOne({ id: options.subscribed_by });
    let name_variable = await Services.Utils.get_first_letter_from_each_word(subscribed_by_details ? subscribed_by_details.fullName : "");
    let features = [];

    let get_subscription_details = await Subscriptions.findOne({ id: options.subscription_id });

    let get_user_details = await Users.findOne({ id: options.user_id });
    if (get_user_details.role == "admin") {
        panel_url = `${credentials.ADMIN_WEB_URL}`;
        heading = `Subscribed`;
        content = `${subscribed_by_details.name} subscribed ${get_subscription_details.name} plan`;
    } else {
        panel_url = `${credentials.FRONT_WEB_URL}`;
        heading = `Your free trial will end soon!`;
        content = `Hi ${subscribed_by_details.fullName}, Your free trial will end on <b> ${await moment(get_subscription_details.trial_period_end_date).format('DD/MM/YYYY')}</b>.Thanks for your purchase our package or subscription.
        We hope you had a good experience. Below are the features which you 
        got in your package or subscription. You are going to love it here!`
    }

    if (get_subscription_details.social_media_platform) {
        features.push(`View and Analyze influencers from ${get_subscription_details.social_media_platform_count} Social Platforms of your choice`);
    }

    if (get_subscription_details.profile_analyse) {
        features.push(`View and Analyze ${get_subscription_details.profile_analyse_count} Profiles`);
    }

    if (get_subscription_details.messaging_outreach) {
        features.push("Influencer Outreach & Messaging");
    }

    if (get_subscription_details.email_outreach) {
        features.push("Email Outreach");
    }

    if (get_subscription_details.contract) {
        features.push("Start Contract");
    }

    if (get_subscription_details.campaign_management) {
        features.push("Campaign Management");
    }


    if (get_subscription_details.members_invite) {
        features.push(`Invite ${get_subscription_details.members_invite_count} Team Members`);
    }

    if (get_subscription_details.chat_support) {
        features.push("Chat Support");
    }

    if (get_subscription_details.priority_hour_support) {
        features.push("Priority Hour Support");
    }

    if (get_subscription_details.account_management) {
        features.push("Dedicated Account Management");
    }

    if (get_subscription_details.multicultural_creative_strategist) {
        features.push("Muticultural Creative Strategist to help with Campaign planning");
    }
    message = '';
    message += `
    <div class="email" style="display: flex; height:auto;">
        <div class="main" style="height:100%;width:900px; margin: auto; padding: 1rem;" >
            <div class="iamges_logo">
                <img src="${credentials.BACK_WEB_URL}/images/logo.png" style="width: 200px; height:auto; margin-left: 15px;"/>
            </div>
            <div class="email" style="width: 800px; height:fit-content;padding: 20px; position: relative;">
                <h2 class="heading" style="font-size:40px; font-weight:600; margin-top: 0px;">Trial Period End Soon</h2>
                <p style="font-size: 18px; font-weight: 400;">${heading}</p>
                <p style="font-size: 18px; font-weight: 400; line-height: 28px;">
                    ${content}
                </p>
                <div style="border: 1px solid #000; height: auto ; padding: 2rem; border-radius: 12px; width: 100%;">
                    <div class="check-mark " style="width: 100px; height: 100px; border-radius: 50%; background: #FFDD55; color: #CBA200; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 600; margin: auto;">
                        ${name_variable}
                    </div>
                    <div class="center2">
                        <h4 class="below" style=" font-size: 35px; font-family: sans-serif; font-weight: 600;  text-align: center; color: #000000;    margin-bottom: 0px;">
                            ${await Services.Utils.title_case(subscribed_by_details.fullName)}
                        </h4>
                        <p class="below" style=" font-size: 27px; font-family: sans-serif; font-weight: 300;  text-align: center; color: #000000;margin-top: 10px;">
                            ${get_subscription_details.name} <b> $${get_subscription_details.amount}</b> Per month
                        </p>
                    </div>


                    <div class="profile" style="margin: 2rem 0px;">
                        <div class="profile_detail" style="display: flex; margin: 2rem 0px 0px 0px; flex-wrap: wrap; width: 100%;"> 
                    `
    if (features && features.length > 0) {
        for await (let feature of features) {
            message += `
                        <div class="name_section" style="border: 1px solid #0500C7; width: 22%; display:flex;align-items:center; -webkit-justify-content: center !important;  padding: 20px; border-radius: 10px; margin:20px;">
                            <p class="influencer" style="font-size: 16px; margin-bottom:10px;"> ${feature}</p>
                        </div>`
        }
    }

    message += `</div>
                </div>
            </div>

            <p style="font-weight: 400; font-size: 16px; line-height:30px; color: #000; text-alignborder: 1px solid #000; height: auto ; padding: 0rem; border-radius: 12px; width: 100%;: center; position: relative; top: 0px;text-align: left;">
                If you have any questions as you’re getting started, drop us a note <a style="text-decoration:none; color: #000;" href="mailto:help@culturereach.com">help@culturereach.com</a>. We’re glad you’re here!
            </p>
            <div class="culture_reach">
                <div style="text-align: center;margin-top: 2rem;">
                    <img src="${credentials.BACK_WEB_URL}/images/short_logo.png" alt="" style=" margin-bottom: 10px; width: 65px;">
                    <p style="font-weight: 400;font-size: 20px;margin-bottom: 5px;">Made by CultureReach Team</p>
                    <a style="font-weight: 100;font-size: 16px; text-decoration:none;" href="www.culturereach.com">www.culturereach.com</a>
                </div>
            </div>
        </div>
    </div>
</div>
`



    SmtpController.sendEmail(email, 'Trial End Soon', message);
};

exports.trial_will_end_email = async (options) => {
    let email = options.email;
    let panel_url;
    let heading;
    let content;

    let subscribed_by_details = await Users.findOne({ id: options.subscribed_by });
    let name_variable = await Services.Utils.get_first_letter_from_each_word(subscribed_by_details ? subscribed_by_details.fullName : "");
    let features = [];

    let get_subscription_details = await Subscriptions.findOne({ id: options.subscription_id });

    let get_user_details = await Users.findOne({ id: options.user_id });
    if (get_user_details.role == "admin") {
        panel_url = `${credentials.ADMIN_WEB_URL}`;
        heading = `Subscribed`;
        content = `${subscribed_by_details.name} subscribed ${get_subscription_details.name} plan`;
    } else {
        panel_url = `${credentials.FRONT_WEB_URL}`;
        heading = `Your free trial will end soon!`;
        content = `Hi ${subscribed_by_details.fullName}, Your free trial will end on <b> ${await moment(get_subscription_details.trial_period_end_date).format('DD/MM/YYYY')}</b>.Thanks for your purchase our package or subscription.
        We hope you had a good experience. Below are the features which you 
        got in your package or subscription. You are going to love it here!`
    }

    if (get_subscription_details.social_media_platform) {
        features.push(`View and Analyze influencers from ${get_subscription_details.social_media_platform_count} Social Platforms of your choice`);
    }

    if (get_subscription_details.profile_analyse) {
        features.push(`View and Analyze ${get_subscription_details.profile_analyse_count} Profiles`);
    }

    if (get_subscription_details.messaging_outreach) {
        features.push("Influencer Outreach & Messaging");
    }

    if (get_subscription_details.email_outreach) {
        features.push("Email Outreach");
    }

    if (get_subscription_details.contract) {
        features.push("Start Contract");
    }

    if (get_subscription_details.campaign_management) {
        features.push("Campaign Management");
    }


    if (get_subscription_details.members_invite) {
        features.push(`Invite ${get_subscription_details.members_invite_count} Team Members`);
    }

    if (get_subscription_details.chat_support) {
        features.push("Chat Support");
    }

    if (get_subscription_details.priority_hour_support) {
        features.push("Priority Hour Support");
    }

    if (get_subscription_details.account_management) {
        features.push("Dedicated Account Management");
    }

    if (get_subscription_details.multicultural_creative_strategist) {
        features.push("Muticultural Creative Strategist to help with Campaign planning");
    }
    message = '';
    //     message += `
    //     <div class="email" style="display: flex; height:auto;">
    //         <div class="main" style="height:100%;width:900px; margin: auto; padding: 1rem;" >
    //             <div class="iamges_logo">
    //                 <img src="${credentials.BACK_WEB_URL}/images/logo.png" style="width: 200px; height:auto; margin-left: 15px;"/>
    //             </div>
    //             <div class="email" style="width: 800px; height:fit-content;padding: 20px; position: relative;">
    //                 <h2 class="heading" style="font-size:40px; font-weight:600; margin-top: 0px;">Trial Period End Soon</h2>
    //                 <p style="font-size: 18px; font-weight: 400;">${heading}</p>
    //                 <p style="font-size: 18px; font-weight: 400; line-height: 28px;">
    //                     ${content}
    //                 </p>
    //                 <div style="border: 1px solid #000; height: auto ; padding: 2rem; border-radius: 12px; width: 100%;">
    //                     <div class="check-mark " style="width: 100px; height: 100px; border-radius: 50%; background: #FFDD55; color: #CBA200; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 600; margin: auto;">
    //                         ${name_variable}
    //                     </div>
    //                     <div class="center2">
    //                         <h4 class="below" style=" font-size: 35px; font-family: sans-serif; font-weight: 600;  text-align: center; color: #000000;    margin-bottom: 0px;">
    //                             ${await Services.Utils.title_case(subscribed_by_details.fullName)}
    //                         </h4>
    //                         <p class="below" style=" font-size: 27px; font-family: sans-serif; font-weight: 300;  text-align: center; color: #000000;margin-top: 10px;">
    //                             ${get_subscription_details.name} <b> $${get_subscription_details.amount}</b> Per month
    //                         </p>
    //                     </div>


    //                     <div class="profile" style="margin: 2rem 0px;">
    //                         <div class="profile_detail" style="display: flex; margin: 2rem 0px 0px 0px; flex-wrap: wrap; width: 100%;"> 
    //                     `
    //     if (features && features.length > 0) {
    //         for await (let feature of features) {
    //             message += `
    //                         <div class="name_section" style="border: 1px solid #0500C7; width: 22%; display:flex;align-items:center; -webkit-justify-content: center !important;  padding: 20px; border-radius: 10px; margin:20px;">
    //                             <p class="influencer" style="font-size: 16px; margin-bottom:10px;"> ${feature}</p>
    //                         </div>`
    //         }
    //     }

    //     message += `</div>
    //                 </div>
    //             </div>

    //             <p style="font-weight: 400; font-size: 16px; line-height:30px; color: #000; text-alignborder: 1px solid #000; height: auto ; padding: 0rem; border-radius: 12px; width: 100%;: center; position: relative; top: 0px;text-align: left;">
    //                 If you have any questions as you’re getting started, drop us a note <a style="text-decoration:none; color: #000;" href="mailto:help@culturereach.com">help@culturereach.com</a>. We’re glad you’re here!
    //             </p>
    //             <div class="culture_reach">
    //                 <div style="text-align: center;margin-top: 2rem;">
    //                     <img src="${credentials.BACK_WEB_URL}/images/short_logo.png" alt="" style=" margin-bottom: 10px; width: 65px;">
    //                     <p style="font-weight: 400;font-size: 20px;margin-bottom: 5px;">Made by CultureReach Team</p>
    //                     <a style="font-weight: 100;font-size: 16px; text-decoration:none;" href="www.culturereach.com">www.culturereach.com</a>
    //                 </div>
    //             </div>
    //         </div>
    //     </div>
    // </div>
    // `


    message += `
<div class="email" style="display: flex; height:auto;">
    <div class="main" style="  height:100%;width:900px;  margin: auto;  border-radius:0px; border: 1px solid #ececec;" >
        <div class="email" style="width:100%; height:fit-content; position: relative;">
            <div class="upper_section" style="background: #002ed3; padding: 4rem; border-radius: 0px 0px 10px 10px;">
                <h2 class="heading" style="font-size:40px; font-weight:600; margin-top: 0px; color: #fff;">
                    Trial Period End Soon
                </h2>
                <p style="font-size: 21px;color: #fff;font-weight: 400;">
                    ${heading}
                </p>
                <p style="font-size: 21px; font-weight: 400; line-height: 28px; color: #fff;">
                    ${content}
                </p>
                <p class="below" style="text-align: center; font-size: 21px; font-weight: 400; line-height: 28px; color: #fff; margin-top: 10px;">
                    ${get_subscription_details.name} <b> $${get_subscription_details.amount}</b> Per ${get_subscription_details.interval}
                </p>
                <div class="update_image" style="text-align: center;">
                    <img src="${credentials.BACK_WEB_URL}/images/character.png" style="width: 600px; height:400px;"/>
                </div>
            </div>

            <div style=" height: auto ; padding: 2rem; border-radius: 12px; width: 100%;">
                <div class="profile" style="margin: 2rem 0px;">
                    <div class="profile_detail"  style="   display: flex; margin: 2rem 0px 0px 0px; flex-wrap: wrap; width: 100%;">`

    if (features && features.length > 0) {
        for await (let feature of features) {
            message += `
                        <div class="name_section" style="border: 1px solid #0500C7; width: 22%; text-align: center; padding: 20px; border-radius: 10px; margin:20px; color: #fff; background-color: #0500C7; ">
                            <p class="influencer" style="font-size: 16px; margin-bottom:10px;"> ${feature}</p>
                        </div>`

        }
    }

    message += `        </div >
                </div>
            </div>

            <p style="font-weight: 400; font-size: 24px; line-height: 24px; color: #000; text-align: center; position: relative; top: 25px;">
                If you have any questions as you’re getting started, drop us a note <a style="text-decoration:none; color: #000;" href="mailto:help@culturereach.com">help@culturereach.com</a>. We’re glad you’re here!
            </p>

            <div class="culture_reach">
                <div style="text-align: center;margin-top: 2rem;">
                    <img src="${credentials.BACK_WEB_URL}/images/short_logo.png" alt="" style=" margin-bottom: 10px; width: 65px;">
                    <p style="font-weight: 400;font-size: 20px;margin-bottom: 5px;">Made by CultureReach Team</p>
                    <a style="font-weight: 100;font-size: 20px; text-decoration:none; color:#000" href="www.culturereach.com">www.culturereach.com</a>
                </div>
            </div>
        </div >
    </div >
</div >
    `

    SmtpController.sendEmail(email, 'Trial End Soon', message);
};


exports.subscription_transaction_email_old = async (options) => {
    let email = options.email;
    let panel_url;
    let heading;
    let content;

    let subscribed_by_details = await Users.findOne({ id: options.subscribed_by });
    let name_variable = await Services.Utils.get_first_letter_from_each_word(subscribed_by_details ? subscribed_by_details.fullName : "");
    let features = [];
    let get_subscription_details = await Subscriptions.findOne({ id: options.subscription_id });
    let get_user_details = await Users.findOne({ id: options.user_id });
    let get_transaction = await Transactions.findOne({ id: options.transaction_id });

    if (get_user_details.role == "admin") {
        panel_url = `${credentials.ADMIN_WEB_URL}`;
        heading = `Subscription Payment`;
        content = `${subscribed_by_details.fullName} paid <b> $${get_transaction ? get_transaction.amount.toFixed(2) : 0} </b> for ${get_subscription_details.name} plan`;
    } else {
        panel_url = `${credentials.FRONT_WEB_URL}`;
        heading = `Thank you for your purchase!`;
        content = `Hi ${subscribed_by_details.fullName},
         This is a gentle reminder that your subscription payment of <b> $${get_transaction ? get_transaction.amount.toFixed(2) : 0} </b>
        is successfully paid.Thank you for being a valued customer!`
    }

    if (get_subscription_details.social_media_platform) {
        features.push(`View and Analyze influencers from ${get_subscription_details.social_media_platform_count} Social Platforms of your choice`);
    }

    if (get_subscription_details.profile_analyse) {
        features.push(`View and Analyze ${get_subscription_details.profile_analyse_count} Profiles`);
    }

    if (get_subscription_details.messaging_outreach) {
        features.push("Influencer Outreach & Messaging");
    }

    if (get_subscription_details.email_outreach) {
        features.push("Email Outreach");
    }

    if (get_subscription_details.contract) {
        features.push("Start Contract");
    }

    if (get_subscription_details.campaign_management) {
        features.push("Campaign Management");
    }


    if (get_subscription_details.members_invite) {
        features.push(`Invite ${get_subscription_details.members_invite_count} Team Members`);
    }

    if (get_subscription_details.chat_support) {
        features.push("Chat Support");
    }

    if (get_subscription_details.priority_hour_support) {
        features.push("Priority Hour Support");
    }

    if (get_subscription_details.account_management) {
        features.push("Dedicated Account Management");
    }

    if (get_subscription_details.multicultural_creative_strategist) {
        features.push("Muticultural Creative Strategist to help with Campaign planning");
    }
    // console.log(features, '===========features');

    message = '';
    message += `
    <div class="email" style="display: flex; height:auto;">
        <div class="main" style="height:100%;width:900px; margin: auto; padding: 1rem;" >
            <div class="iamges_logo">
                <img src="${credentials.BACK_WEB_URL}/images/logo.png" style="width: 200px; height:auto; margin-left: 15px;"/>
            </div>
            <div class="email" style="width: 800px; height:fit-content;padding: 20px; position: relative;">
                <h2 class="heading" style="font-size:40px; font-weight:600; margin-top: 0px;">Trial Period End Soon</h2>
                <p style="font-size: 18px; font-weight: 400;">${heading}</p>
                <p style="font-size: 18px; font-weight: 400; line-height: 28px;">
                    ${content}
                </p>
                <div style="border: 1px solid #000; height: auto ; padding: 2rem; border-radius: 12px; width: 100%;">
                    <div class="check-mark " style="width: 100px; height: 100px; border-radius: 50%; background: #FFDD55; color: #CBA200; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 600; margin: auto;">
                        ${name_variable}
                    </div>
                    <div class="center2">
                        <h4 class="below" style=" font-size: 35px; font-family: sans-serif; font-weight: 600;  text-align: center; color: #000000;    margin-bottom: 0px;">
                            ${await Services.Utils.title_case(subscribed_by_details.fullName)}
                        </h4>
                        <p class="below" style=" font-size: 27px; font-family: sans-serif; font-weight: 300;  text-align: center; color: #000000;margin-top: 10px;">
                            ${get_subscription_details.name} <b> $${get_subscription_details.amount}</b> Per month
                        </p>
                    </div>


                    <div class="profile" style="margin: 2rem 0px;">
                        <div class="profile_detail" style="display: flex; margin: 2rem 0px 0px 0px; flex-wrap: wrap; width: 100%;"> 
                    `
    if (features && features.length > 0) {
        for await (let feature of features) {
            message += `
                        <div class="name_section" style="border: 1px solid #0500C7; width: 22%; display:flex;align-items:center; -webkit-justify-content: center !important;  padding: 20px; border-radius: 10px; margin:20px;">
                            <p class="influencer" style="font-size: 16px; margin-bottom:10px;"> ${feature}</p>
                        </div>`
        }
    }

    message += `</div>
                </div>
            </div>

            <p style="font-weight: 400; font-size: 16px; line-height:30px; color: #000; text-alignborder: 1px solid #000; height: auto ; padding: 0rem; border-radius: 12px; width: 100%;: center; position: relative; top: 0px;text-align: left;">
                If you have any questions as you’re getting started, drop us a note <a style="text-decoration:none; color: #000;" href="mailto:help@culturereach.com">help@culturereach.com</a>. We’re glad you’re here!
            </p>
            <div class="culture_reach">
                <div style="text-align: center;margin-top: 2rem;">
                    <img src="${credentials.BACK_WEB_URL}/images/short_logo.png" alt="" style=" margin-bottom: 10px; width: 65px;">
                    <p style="font-weight: 400;font-size: 20px;margin-bottom: 5px;">Made by CultureReach Team</p>
                    <a style="font-weight: 100;font-size: 16px; text-decoration:none;" href="www.culturereach.com">www.culturereach.com</a>
                </div>
            </div>
        </div>
    </div>
</div>
`


    SmtpController.sendEmail(email, 'Subscription Payment', message);
};

exports.subscription_transaction_email = async (options) => {
    let email = options.email;
    let panel_url;
    let heading;
    let content;

    let subscribed_by_details = await Users.findOne({ id: options.subscribed_by });
    let name_variable = await Services.Utils.get_first_letter_from_each_word(subscribed_by_details ? subscribed_by_details.fullName : "");
    let features = [];
    let get_subscription_details = await Subscriptions.findOne({ id: options.subscription_id });
    let get_user_details = await Users.findOne({ id: options.user_id });
    let get_transaction = await Transactions.findOne({ id: options.transaction_id });

    if (get_user_details.role == "admin") {
        panel_url = `${credentials.ADMIN_WEB_URL}`;
        heading = `Subscription Payment`;
        content = `${subscribed_by_details.fullName} paid <b> $${get_transaction ? get_transaction.amount.toFixed(2) : 0} </b> for ${get_subscription_details.name} plan`;
    } else {
        panel_url = `${credentials.FRONT_WEB_URL}`;
        heading = `Thank you for your purchase!`;
        content = `Hi ${subscribed_by_details.fullName},
         This is a gentle reminder that your subscription payment of <b> $${get_transaction ? get_transaction.amount.toFixed(2) : 0} </b>
        is successfully paid.Thank you for being a valued customer!`
    }

    if (get_subscription_details.social_media_platform) {
        features.push(`View and Analyze influencers from ${get_subscription_details.social_media_platform_count} Social Platforms of your choice`);
    }

    if (get_subscription_details.profile_analyse) {
        features.push(`View and Analyze ${get_subscription_details.profile_analyse_count} Profiles`);
    }

    if (get_subscription_details.messaging_outreach) {
        features.push("Influencer Outreach & Messaging");
    }

    if (get_subscription_details.email_outreach) {
        features.push("Email Outreach");
    }

    if (get_subscription_details.contract) {
        features.push("Start Contract");
    }

    if (get_subscription_details.campaign_management) {
        features.push("Campaign Management");
    }


    if (get_subscription_details.members_invite) {
        features.push(`Invite ${get_subscription_details.members_invite_count} Team Members`);
    }

    if (get_subscription_details.chat_support) {
        features.push("Chat Support");
    }

    if (get_subscription_details.priority_hour_support) {
        features.push("Priority Hour Support");
    }

    if (get_subscription_details.account_management) {
        features.push("Dedicated Account Management");
    }

    if (get_subscription_details.multicultural_creative_strategist) {
        features.push("Muticultural Creative Strategist to help with Campaign planning");
    }
    // console.log(features, '===========features');

    message = '';
    //     message += `
    //     <div class="email" style="display: flex; height:auto;">
    //         <div class="main" style="height:100%;width:900px; margin: auto; padding: 1rem;" >
    //             <div class="iamges_logo">
    //                 <img src="${credentials.BACK_WEB_URL}/images/logo.png" style="width: 200px; height:auto; margin-left: 15px;"/>
    //             </div>
    //             <div class="email" style="width: 800px; height:fit-content;padding: 20px; position: relative;">
    //                 <h2 class="heading" style="font-size:40px; font-weight:600; margin-top: 0px;">Trial Period End Soon</h2>
    //                 <p style="font-size: 18px; font-weight: 400;">${heading}</p>
    //                 <p style="font-size: 18px; font-weight: 400; line-height: 28px;">
    //                     ${content}
    //                 </p>
    //                 <div style="border: 1px solid #000; height: auto ; padding: 2rem; border-radius: 12px; width: 100%;">
    //                     <div class="check-mark " style="width: 100px; height: 100px; border-radius: 50%; background: #FFDD55; color: #CBA200; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 600; margin: auto;">
    //                         ${name_variable}
    //                     </div>
    //                     <div class="center2">
    //                         <h4 class="below" style=" font-size: 35px; font-family: sans-serif; font-weight: 600;  text-align: center; color: #000000;    margin-bottom: 0px;">
    //                             ${await Services.Utils.title_case(subscribed_by_details.fullName)}
    //                         </h4>
    //                         <p class="below" style=" font-size: 27px; font-family: sans-serif; font-weight: 300;  text-align: center; color: #000000;margin-top: 10px;">
    //                             ${get_subscription_details.name} <b> $${get_subscription_details.amount}</b> Per month
    //                         </p>
    //                     </div>


    //                     <div class="profile" style="margin: 2rem 0px;">
    //                         <div class="profile_detail" style="display: flex; margin: 2rem 0px 0px 0px; flex-wrap: wrap; width: 100%;"> 
    //                     `
    //     if (features && features.length > 0) {
    //         for await (let feature of features) {
    //             message += `
    //                         <div class="name_section" style="border: 1px solid #0500C7; width: 22%; display:flex;align-items:center; -webkit-justify-content: center !important;  padding: 20px; border-radius: 10px; margin:20px;">
    //                             <p class="influencer" style="font-size: 16px; margin-bottom:10px;"> ${feature}</p>
    //                         </div>`
    //         }
    //     }

    //     message += `</div>
    //                 </div>
    //             </div>

    //             <p style="font-weight: 400; font-size: 16px; line-height:30px; color: #000; text-alignborder: 1px solid #000; height: auto ; padding: 0rem; border-radius: 12px; width: 100%;: center; position: relative; top: 0px;text-align: left;">
    //                 If you have any questions as you’re getting started, drop us a note <a style="text-decoration:none; color: #000;" href="mailto:help@culturereach.com">help@culturereach.com</a>. We’re glad you’re here!
    //             </p>
    //             <div class="culture_reach">
    //                 <div style="text-align: center;margin-top: 2rem;">
    //                     <img src="${credentials.BACK_WEB_URL}/images/short_logo.png" alt="" style=" margin-bottom: 10px; width: 65px;">
    //                     <p style="font-weight: 400;font-size: 20px;margin-bottom: 5px;">Made by CultureReach Team</p>
    //                     <a style="font-weight: 100;font-size: 16px; text-decoration:none;" href="www.culturereach.com">www.culturereach.com</a>
    //                 </div>
    //             </div>
    //         </div>
    //     </div>
    // </div>
    // `


    message += `
<div class="email" style="display: flex; height:auto;">
    <div class="main" style="  height:100%;width:900px;  margin: auto;  border-radius:0px; border: 1px solid #ececec;" >
        <div class="email" style="width:100%; height:fit-content; position: relative;">
            <div class="upper_section" style="background: #002ed3; padding: 4rem; border-radius: 0px 0px 10px 10px;">
                <h2 class="heading" style="font-size:40px; font-weight:600; margin-top: 0px; color: #fff;">
                    Subscription Payment
                </h2>
                <p style="font-size: 21px;color: #fff;font-weight: 400;">
                    ${heading}
                </p>
                <p style="font-size: 21px; font-weight: 400; line-height: 28px; color: #fff;">
                    ${content}
                </p>
                <p class="below" style="text-align: center; font-size: 21px; font-weight: 400; line-height: 28px; color: #fff; margin-top: 10px;">
                    ${get_subscription_details.name} <b> $${get_subscription_details.amount}</b> Per ${get_subscription_details.interval}
                </p>
                <div class="update_image" style="text-align: center;">
                    <img src="${credentials.BACK_WEB_URL}/images/character.png" style="width: 600px; height:400px;"/>
                </div>
            </div>

            <div style=" height: auto ; padding: 2rem; border-radius: 12px; width: 100%;">
                <div class="profile" style="margin: 2rem 0px;">
                    <div class="profile_detail"  style="   display: flex; margin: 2rem 0px 0px 0px; flex-wrap: wrap; width: 100%;">`

    if (features && features.length > 0) {
        for await (let feature of features) {
            message += `
                        <div class="name_section" style="border: 1px solid #0500C7; width: 22%; text-align: center; padding: 20px; border-radius: 10px; margin:20px; color: #fff; background-color: #0500C7; ">
                            <p class="influencer" style="font-size: 16px; margin-bottom:10px;"> ${feature}</p>
                        </div>`

        }
    }

    message += `        </div >
                </div>
            </div>

            <p style="font-weight: 400; font-size: 24px; line-height: 24px; color: #000; text-align: center; position: relative; top: 25px;">
                If you have any questions as you’re getting started, drop us a note <a style="text-decoration:none; color: #000;" href="mailto:help@culturereach.com">help@culturereach.com</a>. We’re glad you’re here!
            </p>

            <div class="culture_reach">
                <div style="text-align: center;margin-top: 2rem;">
                    <img src="${credentials.BACK_WEB_URL}/images/short_logo.png" alt="" style=" margin-bottom: 10px; width: 65px;">
                    <p style="font-weight: 400;font-size: 20px;margin-bottom: 5px;">Made by CultureReach Team</p>
                    <a style="font-weight: 100;font-size: 20px; text-decoration:none; color:#000" href="www.culturereach.com">www.culturereach.com</a>
                </div>
            </div>
        </div >
    </div >
</div >
    `

    SmtpController.sendEmail(email, 'Subscription Payment', message);
};


exports.upcomming_invoice_email_old = async (options) => {
    let email = options.email;
    let heading;
    let content;

    let subscribed_by_details = await Users.findOne({ id: options.subscribed_by });
    let name_variable = await Services.Utils.get_first_letter_from_each_word(subscribed_by_details ? subscribed_by_details.fullName : "");
    let features = [];
    let get_subscription_details = await Subscriptions.findOne({ id: options.subscription_id });
    let get_user_details = await Users.findOne({ id: options.user_id });

    if (get_user_details.role == "admin") {
        panel_url = `${credentials.ADMIN_WEB_URL}`;
        heading = `Upcoming Payment for ${subscribed_by_details.fullName}.`;
        content = `${subscribed_by_details.fullName} paid <b> $${get_transaction ? get_transaction.amount.toFixed(2) : 0} </b> for ${get_subscription_details.name} plan`;
    } else {
        panel_url = `${credentials.FRONT_WEB_URL}`;
        heading = `Thank you for purchasing the ${get_subscription_details.name} package.`;
        content = `Hi ${subscribed_by_details.fullName}, Thank you for being a valued customer!
        This is a gentle reminder that your subscription will be charged on ${moment(options.period_end * 1000).format('DD/MM/YYYY')}
         and your card will be charged for $${options.amount_due}. 
         If you'd like to keep your subscription, you don't have to do anything from your end.`
    }

    if (get_subscription_details.social_media_platform) {
        features.push(`View and Analyze influencers from ${get_subscription_details.social_media_platform_count} Social Platforms of your choice`);
    }

    if (get_subscription_details.profile_analyse) {
        features.push(`View and Analyze ${get_subscription_details.profile_analyse_count} Profiles`);
    }

    if (get_subscription_details.messaging_outreach) {
        features.push("Influencer Outreach & Messaging");
    }

    if (get_subscription_details.email_outreach) {
        features.push("Email Outreach");
    }

    if (get_subscription_details.contract) {
        features.push("Start Contract");
    }

    if (get_subscription_details.campaign_management) {
        features.push("Campaign Management");
    }

    if (get_subscription_details.members_invite) {
        features.push(`Invite ${get_subscription_details.members_invite_count} Team Members`);
    }

    if (get_subscription_details.chat_support) {
        features.push("Chat Support");
    }

    if (get_subscription_details.priority_hour_support) {
        features.push("Priority Hour Support");
    }

    if (get_subscription_details.account_management) {
        features.push("Dedicated Account Management");
    }

    if (get_subscription_details.multicultural_creative_strategist) {
        features.push("Muticultural Creative Strategist to help with Campaign planning");
    }

    message = '';
    message += `
    <div class="email" style="display: flex; height:auto;">
        <div class="main" style="height:100%;width:900px; margin: auto; padding: 1rem;" >
            <div class="iamges_logo">
                <img src="${credentials.BACK_WEB_URL}/images/logo.png" style="width: 200px; height:auto; margin-left: 15px;"/>
            </div>
            <div class="email" style="width: 800px; height:fit-content;padding: 20px; position: relative;">
                <h2 class="heading" style="font-size:40px; font-weight:600; margin-top: 0px;">Upcoming Payment</h2>
                <p style="font-size: 18px; font-weight: 400;">${heading}</p>
                <p style="font-size: 18px; font-weight: 400; line-height: 28px;">
                    ${content}
                </p>
                <div style="border: 1px solid #000; height: auto ; padding: 2rem; border-radius: 12px; width: 100%;">
                    <div class="check-mark " style="width: 100px; height: 100px; border-radius: 50%; background: #FFDD55; color: #CBA200; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 600; margin: auto;">
                        ${name_variable}
                    </div>
                    <div class="center2">
                        <h4 class="below" style=" font-size: 35px; font-family: sans-serif; font-weight: 600;  text-align: center; color: #000000;    margin-bottom: 0px;">
                            ${await Services.Utils.title_case(subscribed_by_details.fullName)}
                        </h4>
                        <p class="below" style=" font-size: 27px; font-family: sans-serif; font-weight: 300;  text-align: center; color: #000000;margin-top: 10px;">
                            ${get_subscription_details.name} <b> $${get_subscription_details.amount}</b> Per month
                        </p>
                    </div>


                    <div class="profile" style="margin: 2rem 0px;">
                        <div class="profile_detail" style="display: flex; margin: 2rem 0px 0px 0px; flex-wrap: wrap; width: 100%;"> 
                    `
    if (features && features.length > 0) {
        for await (let feature of features) {
            message += `
                        <div class="name_section" style="border: 1px solid #0500C7; width: 22%; display:flex;align-items:center; -webkit-justify-content: center !important;  padding: 20px; border-radius: 10px; margin:20px;">
                            <p class="influencer" style="font-size: 16px; margin-bottom:10px;"> ${feature}</p>
                        </div>`
        }
    }

    message += `</div>
                </div>
            </div>

            <p style="font-weight: 400; font-size: 16px; line-height:30px; color: #000; text-alignborder: 1px solid #000; height: auto ; padding: 0rem; border-radius: 12px; width: 100%;: center; position: relative; top: 0px;text-align: left;">
                If you have any questions as you’re getting started, drop us a note <a style="text-decoration:none; color: #000;" href="mailto:help@culturereach.com">help@culturereach.com</a>. We’re glad you’re here!
            </p>
            <div class="culture_reach">
                <div style="text-align: center;margin-top: 2rem;">
                    <img src="${credentials.BACK_WEB_URL}/images/short_logo.png" alt="" style=" margin-bottom: 10px; width: 65px;">
                    <p style="font-weight: 400;font-size: 20px;margin-bottom: 5px;">Made by CultureReach Team</p>
                    <a style="font-weight: 100;font-size: 16px; text-decoration:none;" href="www.culturereach.com">www.culturereach.com</a>
                </div>
            </div>
        </div>
    </div>
</div>
`


    SmtpController.sendEmail(email, 'Upcoming Payment', message);
};


exports.upcomming_invoice_email = async (options) => {
    let email = options.email;
    let heading;
    let content;

    let subscribed_by_details = await Users.findOne({ id: options.subscribed_by });
    let name_variable = await Services.Utils.get_first_letter_from_each_word(subscribed_by_details ? subscribed_by_details.fullName : "");
    let features = [];
    let get_subscription_details = await Subscriptions.findOne({ id: options.subscription_id });
    let get_user_details = await Users.findOne({ id: options.user_id });

    if (get_user_details.role == "admin") {
        panel_url = `${credentials.ADMIN_WEB_URL}`;
        heading = `Upcoming Payment for ${subscribed_by_details.fullName}.`;
        content = `${subscribed_by_details.fullName} paid <b> $${get_transaction ? get_transaction.amount.toFixed(2) : 0} </b> for ${get_subscription_details.name} plan`;
    } else {
        panel_url = `${credentials.FRONT_WEB_URL}`;
        heading = `Thank you for purchasing the ${get_subscription_details.name} package.`;
        content = `Hi ${subscribed_by_details.fullName}, Thank you for being a valued customer!
        This is a gentle reminder that your subscription will be charged on ${moment(options.period_end * 1000).format('DD/MM/YYYY')}
         and your card will be charged for $${options.amount_due}. 
         If you'd like to keep your subscription, you don't have to do anything from your end.`
    }

    if (get_subscription_details.social_media_platform) {
        features.push(`View and Analyze influencers from ${get_subscription_details.social_media_platform_count} Social Platforms of your choice`);
    }

    if (get_subscription_details.profile_analyse) {
        features.push(`View and Analyze ${get_subscription_details.profile_analyse_count} Profiles`);
    }

    if (get_subscription_details.messaging_outreach) {
        features.push("Influencer Outreach & Messaging");
    }

    if (get_subscription_details.email_outreach) {
        features.push("Email Outreach");
    }

    if (get_subscription_details.contract) {
        features.push("Start Contract");
    }

    if (get_subscription_details.campaign_management) {
        features.push("Campaign Management");
    }

    if (get_subscription_details.members_invite) {
        features.push(`Invite ${get_subscription_details.members_invite_count} Team Members`);
    }

    if (get_subscription_details.chat_support) {
        features.push("Chat Support");
    }

    if (get_subscription_details.priority_hour_support) {
        features.push("Priority Hour Support");
    }

    if (get_subscription_details.account_management) {
        features.push("Dedicated Account Management");
    }

    if (get_subscription_details.multicultural_creative_strategist) {
        features.push("Muticultural Creative Strategist to help with Campaign planning");
    }

    message = '';
    //     message += `
    //     <div class="email" style="display: flex; height:auto;">
    //         <div class="main" style="height:100%;width:900px; margin: auto; padding: 1rem;" >
    //             <div class="iamges_logo">
    //                 <img src="${credentials.BACK_WEB_URL}/images/logo.png" style="width: 200px; height:auto; margin-left: 15px;"/>
    //             </div>
    //             <div class="email" style="width: 800px; height:fit-content;padding: 20px; position: relative;">
    //                 <h2 class="heading" style="font-size:40px; font-weight:600; margin-top: 0px;">Upcoming Payment</h2>
    //                 <p style="font-size: 18px; font-weight: 400;">${heading}</p>
    //                 <p style="font-size: 18px; font-weight: 400; line-height: 28px;">
    //                     ${content}
    //                 </p>
    //                 <div style="border: 1px solid #000; height: auto ; padding: 2rem; border-radius: 12px; width: 100%;">
    //                     <div class="check-mark " style="width: 100px; height: 100px; border-radius: 50%; background: #FFDD55; color: #CBA200; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 600; margin: auto;">
    //                         ${name_variable}
    //                     </div>
    //                     <div class="center2">
    //                         <h4 class="below" style=" font-size: 35px; font-family: sans-serif; font-weight: 600;  text-align: center; color: #000000;    margin-bottom: 0px;">
    //                             ${await Services.Utils.title_case(subscribed_by_details.fullName)}
    //                         </h4>
    //                         <p class="below" style=" font-size: 27px; font-family: sans-serif; font-weight: 300;  text-align: center; color: #000000;margin-top: 10px;">
    //                             ${get_subscription_details.name} <b> $${get_subscription_details.amount}</b> Per month
    //                         </p>
    //                     </div>


    //                     <div class="profile" style="margin: 2rem 0px;">
    //                         <div class="profile_detail" style="display: flex; margin: 2rem 0px 0px 0px; flex-wrap: wrap; width: 100%;"> 
    //                     `
    //     if (features && features.length > 0) {
    //         for await (let feature of features) {
    //             message += `
    //                         <div class="name_section" style="border: 1px solid #0500C7; width: 22%; display:flex;align-items:center; -webkit-justify-content: center !important;  padding: 20px; border-radius: 10px; margin:20px;">
    //                             <p class="influencer" style="font-size: 16px; margin-bottom:10px;"> ${feature}</p>
    //                         </div>`
    //         }
    //     }

    //     message += `</div>
    //                 </div>
    //             </div>

    //             <p style="font-weight: 400; font-size: 16px; line-height:30px; color: #000; text-alignborder: 1px solid #000; height: auto ; padding: 0rem; border-radius: 12px; width: 100%;: center; position: relative; top: 0px;text-align: left;">
    //                 If you have any questions as you’re getting started, drop us a note <a style="text-decoration:none; color: #000;" href="mailto:help@culturereach.com">help@culturereach.com</a>. We’re glad you’re here!
    //             </p>
    //             <div class="culture_reach">
    //                 <div style="text-align: center;margin-top: 2rem;">
    //                     <img src="${credentials.BACK_WEB_URL}/images/short_logo.png" alt="" style=" margin-bottom: 10px; width: 65px;">
    //                     <p style="font-weight: 400;font-size: 20px;margin-bottom: 5px;">Made by CultureReach Team</p>
    //                     <a style="font-weight: 100;font-size: 16px; text-decoration:none;" href="www.culturereach.com">www.culturereach.com</a>
    //                 </div>
    //             </div>
    //         </div>
    //     </div>
    // </div>
    // `

    message += `
<div class="email" style="display: flex; height:auto;">
    <div class="main" style="  height:100%;width:900px;  margin: auto;  border-radius:0px; border: 1px solid #ececec;" >
        <div class="email" style="width:100%; height:fit-content; position: relative;">
            <div class="upper_section" style="background: #002ed3; padding: 4rem; border-radius: 0px 0px 10px 10px;">
                <h2 class="heading" style="font-size:40px; font-weight:600; margin-top: 0px; color: #fff;">
                    Upcoming Payment
                </h2>
                <p style="font-size: 21px;color: #fff;font-weight: 400;">
                    ${heading}
                </p>
                <p style="font-size: 21px; font-weight: 400; line-height: 28px; color: #fff;">
                    ${content}
                </p>
                <p class="below" style="text-align: center; font-size: 21px; font-weight: 400; line-height: 28px; color: #fff; margin-top: 10px;">
                    ${get_subscription_details.name} <b> $${get_subscription_details.amount}</b> Per ${get_subscription_details.interval}
                </p>
                <div class="update_image" style="text-align: center;">
                    <img src="${credentials.BACK_WEB_URL}/images/character.png" style="width: 600px; height:400px;"/>
                </div>
            </div>

            <div style=" height: auto ; padding: 2rem; border-radius: 12px; width: 100%;">
                <div class="profile" style="margin: 2rem 0px;">
                    <div class="profile_detail"  style="   display: flex; margin: 2rem 0px 0px 0px; flex-wrap: wrap; width: 100%;">`

    if (features && features.length > 0) {
        for await (let feature of features) {
            message += `
                        <div class="name_section" style="border: 1px solid #0500C7; width: 22%; text-align: center; padding: 20px; border-radius: 10px; margin:20px; color: #fff; background-color: #0500C7; ">
                            <p class="influencer" style="font-size: 16px; margin-bottom:10px;"> ${feature}</p>
                        </div>`

        }
    }

    message += `        </div >
                </div>
            </div>

            <p style="font-weight: 400; font-size: 24px; line-height: 24px; color: #000; text-align: center; position: relative; top: 25px;">
                If you have any questions as you’re getting started, drop us a note <a style="text-decoration:none; color: #000;" href="mailto:help@culturereach.com">help@culturereach.com</a>. We’re glad you’re here!
            </p>

            <div class="culture_reach">
                <div style="text-align: center;margin-top: 2rem;">
                    <img src="${credentials.BACK_WEB_URL}/images/short_logo.png" alt="" style=" margin-bottom: 10px; width: 65px;">
                    <p style="font-weight: 400;font-size: 20px;margin-bottom: 5px;">Made by CultureReach Team</p>
                    <a style="font-weight: 100;font-size: 20px; text-decoration:none; color:#000" href="www.culturereach.com">www.culturereach.com</a>
                </div>
            </div>
        </div >
    </div >
</div >
    `

    SmtpController.sendEmail(email, 'Upcoming Payment', message);
};


exports.send_invite = async (options) => {

    let get_brand = await Users.findOne({ id: options.brand_id });

    var my_code = get_brand.my_code
    let email = options.email;
    let fullName = options.fullName;

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
                  <h1 style="  margin-bottom: 0px;  margin-top: 10px; font-size: 18px;"><span style="font-weight: 400;color:#373737;">Hi ${fullName},</h1>
                  <p style="margin-top: 0px;    font-size: 14px; color:#373737; margin-bottom: 0;">This is an notification email to let you know about Invite request.
                  </p>
                  </div>
                  </div>
                  </div>
                  <div style="max-width: 308px; margin: auto; padding-bottom: 2rem;">
      <img src="${credentials.BACK_WEB_URL}/images/Daco.png" style="width: 60px;margin-top: 2rem;">
     <p style="margin-bottom: 8px;color: #747474;font-size: 13px;    line-height: 18px; ">You have a new invite request from <b>${await Services.Utils.title_case(get_brand.fullName)}</b> brand.</p>
  
 <div style="margin: 2rem 0px;">
 <a style="font-size: 12px;    background: #0260A5;
 border: none;
 color: #fff;
 padding: 10px 20px;border-radius: 30px;cursor: pointer;  "href=`+ credentials.FRONT_WEB_URL + "/signup/affiliate?referral_code=" + my_code + "&b_id=" + options.brand_id + `>Go to our website</a>
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

    SmtpController.sendEmail(email, 'Invite Request', message)
};

