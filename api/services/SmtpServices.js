const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

exports.test_smtp = async (to, subject, message, res) => {
    try {
        let smtp = await Smtp.find({});
        console.log(smtp, '==========smtp');
        if (smtp && smtp.length > 0) {
            let port = Number(smtp[0].port) || 587;
            let transport = nodemailer.createTransport(smtpTransport({
                host: smtp[0].host,
                port: port,
                secure: port === 465,
                debug: true,
                auth: {
                    user: smtp[0].user,
                    pass: smtp[0].pass
                },
                tls: {
                    rejectUnauthorized: false
                }
            }));

            let verify = await transport.verify();
            console.log(verify, '[verify]');
            return verify;
        }
        return false;
    } catch (error) {
        console.error('SMTP verification failed:', error);
        return false;
    }
};
