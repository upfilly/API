const SmtpController = require('../controllers/SmtpController');
const credentials = require('../../config/local');


exports.sendCouponNotificationEmail = async (options) => {
  const {
    brandFullName,
    affiliateFullName,
    affiliateEmail,
    couponTitle,
    couponCode,
    expirationDate,
    visibility,
  } = options;

  let message = `
  <body style="font-family: sans-serif;">
    <div style="width:600px;margin:auto;margin-top:2rem;box-shadow:0px 0px 20px -15px #000;">
      <div style="text-align: center;">
        <div style="background: url('${
          credentials.BACK_WEB_URL
        }/images/banner.png'); background-size: 100%; height: 260px;"></div>
        
        <div style="margin-top:-190px;">
          <div style="width:225px;height:225px;box-shadow:10px 4px 3px 0px #0000000d;padding:1rem;text-align:center;
                      border:5px solid #00BAFF;background:#fff;margin:auto;border-radius:50%;display:flex;justify-content:center;align-items:center;">
            <div>
              <img src="${
                credentials.BACK_WEB_URL
              }/images/upfilly.png" style="width:115px;height:40px;object-fit:contain;">
              <h1 style="margin-bottom:0;margin-top:10px;font-size:18px;"><span style="font-weight:400;color:#373737;">Hi </span>${affiliateFullName},</h1>
              <p style="margin-top:0;font-size:14px;color:#373737;margin-bottom:0;">
                You have received a ${
                  visibility === "Public" ? "new public" : "private"
                } coupon from ${brandFullName}.
              </p>
              <p style="margin-top: 8px;"><strong>Title:</strong> ${couponTitle}</p>
              <p><strong>Code:</strong> ${couponCode}</p>
${expirationDate ? `<p><strong>Expires On:</strong> ${expirationDate}</p>` : ""}
            </div>
          </div>
        </div>

        <div style="margin-bottom:2rem;">
          <img src="${
            credentials.BACK_WEB_URL
          }/images/Image1.png" style="width:40px;">
          <img src="${
            credentials.BACK_WEB_URL
          }/images/Image2.png" style="width:40px;">
          <img src="${
            credentials.BACK_WEB_URL
          }/images/Image3.png" style="width:40px;">
          <img src="${
            credentials.BACK_WEB_URL
          }/images/Image4.png" style="width:40px;">
        </div>

        <p style="color:#626262;font-size:11px;margin-bottom:0;">Copyright © ${new Date().getFullYear()}</p>
      </div>
    </div>
  </body>
  `;

   SmtpController.sendEmail(
    affiliateEmail,
    ` ${brandFullName} shared a new ${visibility === 'Public' ? 'public' : 'private'} coupon`,
    message
  );
};
