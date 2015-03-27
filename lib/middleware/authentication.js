var mongoose = require('mongoose');
var passport = require('passport') ;
var BearerStrategy = require('passport-http-bearer').Strategy;
var models = require('../models') ;
var User = mongoose.model('User');
var debug = require('debug')('node-examples') ;

module.exports = new BearerStrategy({}, function(token, done) {
    debug('attempting to retrieve user with token: %s', token) ;
    User.findByToken( token, function(err, user){
        if( err ) return done( err ) ;
        if( !user ) return done( null, false) ;
        debug('found a user: ', user) ;
        return done( null, user ) ;
    }); 
}) ;