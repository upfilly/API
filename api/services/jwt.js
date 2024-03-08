const fs = require('fs');
const jwt = require('jsonwebtoken');

// use 'utf8' to get string instead of byte array  (512 bit key)
var privateKEY = fs.readFileSync('./private.key', 'utf8');
var publicKEY = fs.readFileSync('./public.key', 'utf8');

module.exports = {

    sign: (payload, $Options) => {
        /*
         sOptions = {
          issuer: "Authorizaxtion/Resource/This server",
          subject: "iam@user.me",
          audience: "Client_Identity" // this should be provided by client
         }
        */  // Token signing options
        var signOptions = {
            issuer: $Options.issuer,
            subject: $Options.subject,
            audience: $Options.audience,
            expiresIn: "10h",    // 10 hours validity
            algorithm: "RS256"
        };
        return jwt.sign(payload, privateKEY, signOptions);
    },

    verify: (token, $Option, cb) => {

        var verifyOptions = {
            issuer: $Option.issuer ? $Option.issuer : '',
            subject: $Option.subject,
            audience: $Option.audience,
            expiresIn: "10h",
            algorithm: ["RS256"]
        }; try {
            return jwt.verify(token, publicKEY, verifyOptions, cb);
        } catch (err) {
            return false;
        }
    },

    decode: (token) => {
        return jwt.decode(token, { complete: true });
        //returns null if token is invalid
    }
}
