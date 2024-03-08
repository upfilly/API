const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

exports.test_smtp = async (to, subject, message,res) => {
    let smtp = await Smtp.find({});
    // console.log(smtp, '==========smtp');
    if (smtp && smtp.length > 0) {
        transport = nodemailer.createTransport(smtpTransport({
            host: smtp[0].host,
            port: smtp[0].port,
            debug: true,
            sendmail: true,
            requiresAuth: true,
            auth: {
                user: smtp[0].user,
                pass: smtp[0].pass
            },
            tls: {
                rejectUnauthorized: false
            }
        }));

        // console.log('[passed][transport]');

        setTimeout(() => {
            return res.status(400).json({
                success: false,
                "error": { "code": 400, "message": "SMTP credentials are not valid." }
            })

        }, 30000);

        let verify = await transport.verify()

        // console.log(verify, '[verify]');
        return verify;
    }

    return false
}

