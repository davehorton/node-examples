var express = require('express');
var router = express.Router() ;
var mongoose = require('mongoose');
var User = mongoose.model('User');
var passport = require('passport') ; 
var debug = require('debug')('node-examples') ;

module.exports = function (app) {
  app.use('/api', router);
};

//retrieve user, optionally with query
router.get('/users?*', 
    passport.authenticate('bearer', { session: false }), //middleware - api requires authentication
    function (req, res, next) {
    
        // if we get here, the request was successfully authenticated
        User.find(req.query, function (err, users) {
            if (err) return next(err);
            res.json( users ); 
        });
});
