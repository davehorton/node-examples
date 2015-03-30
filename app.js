var express = require('express') ;
var app = express();
var config = require('./config') ;
var mongoose = require('mongoose');
var logger = require('morgan');
var bodyParser = require('body-parser');
var multer  = require('multer') ;
var passport = require('passport') ;
var tokenAuth = require('./lib/middleware/authentication') ;

mongoose.connect(config.db);
var db = mongoose.connection;
db.on('error', function () {
  throw new Error('unable to connect to database at ' + config.db);
});

require('./lib/models') ;

passport.use( tokenAuth ) ;

//common middleware we want to apply to all requests
app.use(logger('dev'));
app.use('/api', passport.initialize());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(multer({dest: '/tmp'})) ;

//now include our routes
require('./lib/routes')( app, config ) ;

//error handlers
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


app.use(function (err, req, res, next) {
    console.error('Error: ', err) ;
    res.send(err.status || 500);
});


app.listen(config.port);
