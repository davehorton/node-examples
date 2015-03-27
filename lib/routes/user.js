var express = require('express');
var router = express.Router() ;
var mongoose = require('mongoose');
var User = mongoose.model('User');
var _ = require('lodash');
var debug = require('debug')('node-examples') ;

module.exports = function (app) {
  app.use('/', router);
};

//retrieve users, optionally with query
router.get('/users?*', function (req, res, next) {
  User.find(req.query, function (err, users) {
    if (err) return next(err);
    res.json( users ); 
  });
});

//retrieve a user by id
router.get('/user/:id', function(req, res, next){
  User.findById( req.params.id, function(err, user){
    if( err ) return next(err) ;
    res.json(user) ;
  }) ;
}) ;

//add a user
router.post('/user', function(req, res, next){
  var data = req.body ;
  var user = new User( req.body ) ;
  user.save( function(err, user ){
    if( err ) return next(err) ;
    res.json( user ) ;
  }) ;
}) ;

//update a user
router.put('/user/:id', function( req, res, next){
  debug('updating data: ', data) ;
  var data = _.omit( req.body, ['_id', '_v'] ); 
  User.findByIdAndUpdate( req.params.id, data, function(err, user){
    if( err ) return next(err) ;
    res.json(user) ;
  }) ;
}) ;

//delete a user
router.delete('/user/:id', function( req, res, next){
  User.findByIdAndRemove( req.params.id, function(err, user){
    if( err ) return next(err) ;
    res.json(user) ;
  });
}) ;
