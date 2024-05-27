const { response } = require("express");

module.exports.http = {
  middleware: {
    activityLogger: function (req, res, next) {

      let originalSend = res.send;

      let responseBody;

      res.send = function (data) {
        responseBody = data;
        return originalSend.apply(res, arguments);
      };

      res.on("finish", async function () {

        responseBody = JSON.parse(responseBody);
        if(req.url.split("?")[0] !== "/getallactivities"){
        if (responseBody.code >= 200 && responseBody.code < 300) {

         if(req.identity) {let user = await Users.findOne({ id: req.identity.id });

          if (user.activeUser && user.activeUser != null) {
            parentUserId = user.activeUser;
          } else {
            parentUserId = user.id;
          }
          console.log("reached here");
          ActivityLogs.create({
            user_id: req.identity.id,
            message: responseBody.message,
            method: req.method,
            data:responseBody,
            url: req.url,
            status:"success",
            parentUserId: parentUserId,
          }).exec((err) => {
            if (err) {
              sails.log.error("Failed to log influencer activity:", err);
            }
          });}

        }else{
          if(responseBody.success === false){
            if(req.identity){let code = responseBody.error.code;
            let message = responseBody.error.message;
            ActivityLogs.create({
              user_id: req.identity.id,
              message: message,
              method: req.method,
              data:responseBody,
              url: req.url,
              status:"failed",
              parentUserId: parentUserId,
            }).exec((err) => {
              if (err) {
                sails.log.error("Failed to log influencer activity:", err);
              }
            });}
          }
        }
      }


      });
      // Pass control to the next middleware or controller
      return next();
    },

    order: [
      // Register the logger middleware

      // Add logger to the middleware order
      // 'startRequestTimer',
      "cookieParser",
      "session",
      "bodyParser",
      "activityLogger", // Added custom logger middleware
      "compress",
      "poweredBy",
      "router",
      "www",
      "favicon",
      // '404',
      // '500'
    ],
  },
};
