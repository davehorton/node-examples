var express = require('express');
var router = express.Router() ;
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Greeting = mongoose.model('Greeting');
var _ = require('lodash');
var async = require('async') ;
var moment = require('moment') ;
var debug = require('debug')('node-examples') ;
var tmp = require('tmp') ;
var fs = require('fs') ;
var path = require('path') ;
var execFile = require('child_process').execFile ;
var greetingPath ;

module.exports = function (app, config) {
    debug('config: ', config) ;
    greetingPath = config.greetingPath ;
    debug('greetingPath: ', greetingPath) ;
    app.use('/', router);
};

//get all greetings
router.get('/greetings?*',function(req, res, next){
    Greeting.find(req.query, function(err, greetings){
        if( err ) return next(err) ;
        res.json(greetings) ;
    }) ;
}) ;


//get a list of greetings for a user
router.get('/user/:id/greetings', function (req, res, next) {
  User
  .findById(req.params.id)
  .populate('greeting_ids')
  .exec( function (err, user) {
    if (err) return next(err);
    if( null === user ) return res.sendStatus(404) ;

    res.json( user.greeting_ids ); 
  });
});

//upload a greeting for a user - update the database, transcode the greeting, and save it in a folder
router.post('/user/:id/greeting', function( req, res, next){
    debug('req.body: ' + JSON.stringify(req.body)) ;
    debug('req.files: ' + JSON.stringify(req.files)) ;
    
    var name = req.body.name;
    var file = req.files.greeting ;

    //generate the fully-qualified file name for the stored greeting - {filename}-{timestamp}.gsm in the greetings folder
    var originalName = req.files.greeting.originalname ;
    var filename = originalName.slice(0, originalName.lastIndexOf('.')) + '-' + moment.utc().format('YYYYMMDDHHmmssSSS') + '.gsm' ;
    var newFilename = path.join( greetingPath, filename) ;
    
    //update the database and do the transcoding in parallel
    async.parallel([
            function updateDatabase( callback ) { //this happens.....
                var greeting = new Greeting({
                    name: name,
                    folder_location: newFilename
                }) ;

                //save the greeting...
                greeting.save( function(err, greeting){
                    if( err ) return callback(err) ;
 
                    //..and add it to the User's array of greetings
                    User.findByIdAndUpdate( req.params.id, {$push: {greeting_ids: greeting._id}}, function(err, user){
                        callback(err, greeting ) ;
                    }) ;
                }) ;
            }, 
            function transcodeGreeting( callback ) { //...at the same time as this
                //create the file...
                fs.open( newFilename, 'w', function(err){
                    if( err ) return next(err) ;

                    //..and have sox transcode into it to gsm
                    execFile('sox', [req.files.greeting.path, '-t', 'gsm', '-r', '8k', newFilename], function(err) {
                        callback(err) ;
                     }) ;
                }) ;
            }
        ], function(err, results){
            //when we get here, both operations have completed
            if( err ) return next( err ) ;
            res.json(results[0]) ;
    }) ;
});