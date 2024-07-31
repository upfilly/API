module.exports = function attachUser(sails) {
    return {
      initialize: function (cb) {
        sails.log.info('Initializing hook... (`attachUser`)');
        return cb();
      },
  
      routes: {
        before: {
          '/*': function (req, res, next) {
            // Assuming you have user info in session or JWT
            if (req.identity && req.identity.id) {
              req.user = req.identity.id;
            }
            return next();
          }
        }
      }
    };
  };