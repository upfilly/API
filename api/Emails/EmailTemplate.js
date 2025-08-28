const SmtpController = require('../controllers/SmtpController');
const credentials = require('../../config/local');
const Services = require('../services/index');
const moment = require('moment');


exports.sendEmailTemplate = async (options) => {
  const {
    brandFullName,
    affiliateFullName,
    affiliateEmail,
    affiliateLink,
    customMessage
  } = options;

  const message = `
    <body style="font-family: sans-serif;">
      <div style="width:600px;margin:auto;margin-top:2rem;box-shadow:0px 0px 20px -15px #000;position:relative;">
        <div style="text-align:center;">
          <div style="background:url('${
            credentials.BACK_WEB_URL
          }/images/banner.png');background-size:100% !important;width:100% !important;height:260px;"></div>
          <div style="margin-top:-190px !important;">
            <div style="width:225px;height:225px;box-shadow:10px 4px 3px 0px #0000000d;padding:1rem;text-align:center;display:flex;border:5px solid #00BAFF;background:#fff;margin:auto;border-radius:50%;justify-content:center;align-items:center;">
              <div>
                <img src="${
                  credentials.BACK_WEB_URL
                }/images/upfilly.png" style="width:115px;height:40px;object-fit:contain;">
                <h1 style="margin-bottom:0px;margin-top:10px;font-size:18px;">
                  <span style="font-weight:400;color:#373737;">Hi </span>${affiliateFullName},
                </h1>

                <!-- Custom message text (does NOT include the link) -->
                <p style="margin-top:0px;font-size:14px;color:#373737;margin-bottom:10px;">
                  ${customMessage}
                </p>

                <!-- Affiliate link shown ONLY as a button -->
                
                ${
                  affiliateLink && affiliateLink.trim() !== ""
                    ? `
  <a href="${affiliateLink.trim()}" target="_blank" style="display:inline-block;margin-top:10px;padding:10px 20px;background-color:#00BAFF;color:#ffffff;text-decoration:none;border-radius:5px;font-size:14px;">
    Visit Your Affiliate Page
  </a>
`
                    : ""
                }
              </div>
            </div>
          </div>
        </div>

        <div style="margin-bottom:2rem;text-align:center;">
          <span><img src="${
            credentials.BACK_WEB_URL
          }/images/Image1.png" style="width:40px;"></span>
          <span><img src="${
            credentials.BACK_WEB_URL
          }/images/Image2.png" style="width:40px;"></span>
          <span><img src="${
            credentials.BACK_WEB_URL
          }/images/Image3.png" style="width:40px;"></span>
          <span><img src="${
            credentials.BACK_WEB_URL
          }/images/Image4.png" style="width:40px;"></span>
        </div>

        <p style="color:#626262;font-size:11px;text-align:center;margin-bottom:0px;">
          Copyright © ${new Date().getFullYear()}
        </p>
      </div>
    </body>
  `;

  SmtpController.sendEmail(affiliateEmail, 'Received Email Template Message', message);
};