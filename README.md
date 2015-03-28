# node-examples

##Installation
To run these examples, you will first need to install [node.js](https://nodejs.org/download/) on your laptop or server.  You will also need mongo installed on your machine.  (You can alternatively access a mongo database somewhere on your network, but in that case you'll need to modify the config.js file accordingly).

Next, clone the repository into a directory on your server, change into that directory, and run 

```js
git clone https://github.com/davehorton/node-examples.git
cd node-examples
npm install
```

at that point you can run the application by doing:

```js
DEBUG=* node app.js
```
> Note: the 'DEBUG=*' is not necessary, but will print out debug messages from the various modules that are used, as well as any debug messages that you may add to the code.  Some of these messages might give you a better understanding/visualization of how the middleware is processing your request, thus I recommend it for this example.

## Structure of the demo

This is a simple demo that consists of two mongo collections: a Users collection and Greetings collections.  Users have one or more Greetings, and Greetings represent audio files that are played from the User's voicemail service.  When saving a Greeting, we need to not only update the database, but also transcode the provided audio file and store it in a folder somewhere. 

> This is a simple example with many shortcuts; for instance, we transcode to gsm format for no particular reason other than to be able to invoke the sox utility, and we also store the audio files on local disk whereas in a production app we would probably want to store them in shared, redundant, and network-accessible storage of some kind.

## Quick overview of the code structure

app.js in the root directory is the main file that kicks everything off.  We'll come back to that file later, and take a more detailed look but it basically connects to mongo and configures express, which is the middleware framework used to handle the HTTP requests. Don't worry about understanding everything it does at this point, though.

In the lib/models directory we have files that each map to a collection in the mongo database (except for index.js).  Have a look at user.js and greeting.js -- they will be pretty easy to understand.  The index.js file exists just so that you can add files to this directory as you create new models in the database and they are automatically made available to the rest of the code.

Somewhat similarly, in the lib/routes directory we have a set of HTTP routes and associated logic (and an index.js file to make it easy to bring them all into the app, and let you add new routes easily).  Have a look at ./lib/routes/user.js, as it is pretty easy to understand.  You can quickly get the sense that here we have the logic to respond to REST requests for the User resouce: HTTP GET, POST, PUT, and DELETE are all handled here.  You'll see the code is very simple, and there isn't a lot of it.

## Simple asynchronous behavior

Let's keep looking at ./lib/routes/user.js.  It provides a good example of the basic asynchronous programming pattern.  In this case, we are going to retrieve, insert, update or delete Users in the mongo database, and we don't want the node.js event thread blocked while we are waiting for mongo to respond to our requests.  

So if you look at how we retrieve a user from the database (in response to an HTTP GET request), the code looks like this:

```js
// lib/routes/user.js

//retrieve a user by id
router.get('/user/:id', function(req, res, next){
  User.findById( req.params.id, function(err, user){
    if( err ) return next(err) ;
    res.json(user) ;
  }) ;
}) ;
```

First of all, notice that the code is pretty simple.  A few lines of code to provide part of a REST API for retrieving a resource.  

Second, notice the asynchronous pattern: we make an asychronous request (User.findById), and provide a callback function to be invoked when that request is completed.  In between the invocation of the request and its completion, we are not blocking waiting for it and instead node.js is handling other requests.  Our callback is invoked by nodejs when the results are available.

The signature of the callback function is pretty standard: by convention, the first argument is always an error object (a null value, if no error has occurred), followed by any data returned from the operation.

Stepping back a bit further, the 'router.get' method is [expressjs](http://expressjs.com) middleware framework for managing HTTP requests.  We define 'routes', which are HTTP URL patterns (they can be simple, as in this example, or more complex regex patterns) and associate the code we want invoked when we receive a request on that route.  

Our route callback (function(req,res,next)) is passed a 'req' object that represents the HTTP request (we can access this to get things like query args, headers, etc), a 'res' object that represents the HTTP response we will generate (we can access this to send our response, set an HTTP status code, attach headers to the response object, etc), and a 'next' function.  

The 'next' function is provided because express middleware can be arranged in a sort of filter chain, where each middleware in the chain can choose to either:

+ do nothing, and pass control to the next middleware (by invoking the 'next()' function),
+ generate a response to the request (in which case the response stops propagating up the middleware chain), or
+ generate an error, and punt the error up the chain to be dealt with by a special middleware error handler (by invoking 'next(error)').

In the case above, as long as there was no error retrieving the user, we are generating a response to the request where the response will consist of a JSON document (returned in an HTTP 200 OK).

Also note that the route contains a template parameter, :id, which represents a user id passed in the uri (i.e. the actual HTTP request would look something like HTTP GET /user/5515ec8b7e3e7fb73dbc44d9, where the '5515ec8b7e3e7fb73dbc44d9' represents the _id field in the mongo User collection).  The template parameters we put in the route pattern are available to use in the req.params object, as shown above

## Time to have fun

So let's fire up this app and add some data.

### Adding a user

Since we don't have a GUI built, we'll use curl to exercise the API.  

In one terminal window, start the application (DEBUG=* node app.js) -- by default, it will create an HTTP server listening on port 3000.  In a second terminal window, do the following:

```bash
 curl -H "Content-Type: application/json" -d '{"username":"xyz","password":"xyz", "first_name":"Dave", "last_name": "Horton", "token":"1234567890"}' http://localhost:3000/user
```

If the user is successfully added, our service will respond with the added user object:

```bash
{"__v":0,"username":"xyz","password":"xyz","first_name":"Dave","last_name":"Horton","token":"1234567890","_id":"55160819a26a6c27419d3920","date_created":"2015-03-28T01:47:05.185Z","greeting_ids":[]}
```

Note that it has assigned a unique id in the User collection in mongo (the '_id' property), initialized it with an empty set of greetings, and defaulted the 'date_created' property to the current time.

### Retrieving a user

Now that we have a user in our database, let's turn around and retrieve a list of users:

```bash
$curl --request GET http://localhost:3000/users
[{
    "_id":"55160819a26a6c27419d3920",
    "username":"xyz",
    "password":"xyz",
    "first_name":"Dave",
    "last_name":"Horton",
    "token":"1234567890",
    "__v":0,
    "date_created":"2015-03-28T01:47:05.185Z",
    "greeting_ids":[]
}]
```
> Note: if you are following along with these operations on your own machine, you will get different mongo id values, and will need to substitute your ids in at the appropriate places in the operations that follow.

> Also, for readability sake I have formatted the JSON output from the response a bit above with line breaks and indentation; you won't see those in the actual responses that are returned in your terminal session.

That query retrieved a list of all users -- of which there is currently only one.  If we want to retrieve a user by id, we can do that because we added a route specifically for that in lib/routes/user.js:

```bash
$curl --request GET http://localhost:3000/user/55160819a26a6c27419d3920

{"_id":"55160819a26a6c27419d3920","username":"xyz","password":"xyz","first_name":"Dave","last_name":"Horton","token":"1234567890","__v":0,"date_created":"2015-03-28T01:47:05.185Z","greeting_ids":[]}
```

Let's add a second user:

```bash
$curl -H "Content-Type: application/json" -d '{"username":"abc","password":"abc","first_name":"Ed", "last_name": "Robbins", "token":"foobar"}' http://localhost:3000/user

{"__v":0,"username":"abc","password":"abc","first_name":"Ed","last_name":"Robbins","token":"foobar","_id":"55160d30f43e193542fb0019","date_created":"2015-03-28T02:08:48.301Z","greeting_ids":[]}
```

Now let's query by first name

```bash
$curl --request GET http://localhost:3000/users?first_name=Ed

[{"_id":"55160d30f43e193542fb0019","username":"abc","password":"abc","first_name":"Ed","last_name":"Robbins","token":"foobar","__v":0,"date_created":"2015-03-28T02:08:48.301Z","greeting_ids":[]}]
```

In that scenario were were using the route which is defined to have optional query args:

```js
// lib/routes/user.js

//retrieve users, optionally with query
router.get('/users?*', function getAll(req, res, next) {
  User.find(req.query, function (err, users) {
    if (err) return next(err);
    res.json( users ); 
  });
});
```

The 'req.query' property is an object which contains key-value pairs for the query args provided in the URI.  In this case, we can simply pass those query args directly into our mongo query to further filter the results.

Now lets delete Ed:

```bash
$curl -X DELETE http://localhost:3000/user/55160d30f43e193542fb0019

{"_id":"55160d30f43e193542fb0019","username":"abc","password":"abc","first_name":"Ed","last_name":"Robbins","token":"foobar","__v":0,"date_created":"2015-03-28T02:08:48.301Z","greeting_ids":[]}
```
Our REST API for deleting a User removes the user from mongo and returns us the deleted user.  If we query for users with first name 'Ed' now, we'll see there aren't any.

Let's update our existing Dave user, and give him a new password:

```bash
$curl -H 'Content-Type: application/json' -X PUT -d '{"password":"aaa"}' http://localhost:3000/user/55160819a26a6c27419d3920

{"_id":"55160819a26a6c27419d3920","username":"xyz","password":"aaa","first_name":"Dave","last_name":"Horton","token":"1234567890","__v":0,"date_created":"2015-03-28T01:47:05.185Z","greeting_ids":[]}
```

## More complex asynchronous behavior

Now, I grant you, the examples above were simple.  Asynchronous programming can become more complex when you have multiple asynchronous operations that are interdependent and concurrent.  However, that is where the [async](https://github.com/caolan/async) library can be a big help.

Let's turn to look at lib/routes/greeting.js, where things get a bit more complicated.  Now, when a user wants to add a greeting, we need to do several things:

1. Update the database with the new greeting (add it to the Greeting collection, and also add a reference to that greeting in the User's list of greetings)

2. Upload the audio file to the server

3. Transcode the audio file (in this case, we are going to arbitrarily transcode it to gsm format).

4. Save the transcoded file in a folder somewhere, and make sure the database entry has the name of that location.

Furthermore, want to do some of that in parallel -- we should be able to start the transcoding operation and the database insert at the same time, since they don't depend on each other.  The transcoding is going to be the lengthiest part of the operation, so there is no reason to delay starting it while we wait for a database insert to complete.

Most importantly, we don't want to block the nodejs event loop while the expensive transcoding operation is going on: we'll fork a new process for that, and be notified asynchronously when it is complete.

So, with those requirements, here is the code that does it:

```js
// lib/routes/greeting.js

router.post('/user/:id/greeting', function( req, res, next){
    var name = req.body.name;
    var file = req.files.greeting ;

    //generate a timestamped file name for the stored greeting 
    var originalName = req.files.greeting.originalname ;
    var filename = originalName.slice(0, originalName.lastIndexOf('.')) + 
        '-' + moment.utc().format('YYYYMMDDHHmmssSSS') + '.gsm' ;
    var newFilename = path.join( greetingPath, filename) ;
    
    //update the database and do the transcoding in parallel
    async.parallel([
            function updateDatabase( callback ) { 
                var greeting = new Greeting({
                    name: name,
                    folder_location: newFilename
                }) ;

                //save the greeting...
                greeting.save( function(err, greeting){
                    if( err ) return callback(err) ;
 
                    //..and add it to the User's array of greetings
                    User.findByIdAndUpdate( req.params.id, 
                        {$push: {greeting_ids: greeting._id}}, 
                        function(err, user){
                            callback(err, user) ;
                    }) ;
                }) ;
            }, 
            function transcodeGreeting( callback ) { 
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
            res.json(results[0]) ; //return the user
    }) ;
});
```
Before we try it out, notice a couple of things:

+ We're handling a multi-part body in a POST request.  The POST body has been nicely parsed for us into a javascript object that represents the data provided in the provided form variables (remember: the POST request contained the data in url-encoded strings, but we get to access them easily as properties in the 'req.body' object).  We got that done for us for free by the 'multer' middleware we included in the main app.js file.

+ The uploaded file has been automatically saved in a temp directory and made available to us with information including the original filename and so forth.

+ The 'updateDatabase' and 'transcodeGreeting' functions happen in parallel, and both are asynchronous (i.e. neither blocks the nodejs event thread).  This is what makes nodejs scale so well -- every I/O operation (network or local) is asynchronous, freeing nodejs to service other requests.

OK, let's try it out, using a PCMU wave file that is four minutes long.

```bash
$curl -F "name=primary_greeting" -F "greeting=@/Users/dhorton/beachdog-enterprises/beachdog-networks/git/node-examples/recordings/long_moh_clip.wav" http://localhost:3000/user/55160819a26a6c27419d3920/greeting

{"_id":"55160819a26a6c27419d3920","username":"xyz","password":"aaa","first_name":"Dave","last_name":"Horton","token":"1234567890","__v":0,"date_created":"2015-03-28T01:47:05.185Z","greeting_ids":["551613e5f43e193542fb001a"]}
```
If we switch back to the console that node.js is running in, we can see from the DEBUG logging that the operation took a little under 900 milliseconds.  Not bad, considering almost all of that was the time for the external 'sox' utility to do the transcoding.

```bash
POST /user/55160819a26a6c27419d3920/greeting 200 869.691 ms - 224
```
Let's make sure the database has been properly updated, by querying that user and retrieving his greetings:

```bash
$curl --request GET http://localhost:3000/user/55160819a26a6c27419d3920/greetings

[{"_id":"551613e5f43e193542fb001a",
    "name":"primary_greeting",
    "folder_location":"/Users/dhorton/beachdog-enterprises/beachdog-networks/git/node-examples/recordings/transcoded/long_moh_clip-20150328023725543.gsm",
    "__v":0,
    "date_created":"2015-03-28T02:37:25.545Z"
}]
```
Great.  We have the audio file location in the database, associated with the user, and if we check that location we can see the file is there and has been transcoded into gsm.

## Authentication

Our REST API might be used from a web GUI, where a user would authenticate with a username and password, or perhaps we might want to expose it to API users, who would authenticate using something like OAuth and a token of some kind.  

Nodejs and express middleware lend themselves nicely to managing authentication, because we can simply create some middleware that gets executed early in the middleware stack that will either authenticate the user, or return a 401 Unauthorized.

Let's create a simple REST resource that we intend to expose to API users, and protect it with Bearer authentication in the Authorization header.

### Passport middleware

[Passport](http://passportjs.org/) is a nodejs module that provides a very flexible authentication handling.  First, we include in in our app.js, and the put it into our middleware stack.  

```js
var passport = require('passport') ;
var tokenAuth = require('./lib/middleware/authentication') ;

....

passport.use( tokenAuth ) ;

//common middleware we want to apply to all requests
app.use(logger('dev'));
app.use('/api', passport.initialize());

```

First we require'd the module, to make it available.  Then we called 'passport.use' and passed in our own bit of code that is needed to determine whether the API user passed in a valid token.  

Next, we included passport in our middleware stack (i.e. app.use).  Note, however, that we are only including this middleware for uri requests that begin with '/api'.  That is because for GUI users we use a different form of authentication (username/password authentication).  We only want to use this token-based authentication for API users.

OK, now we need to write the code that will determine whether a valid token has been provided in the Authorization header.  In the case of our simple demo, we have a 'token' property in our User collection that we will use for this, so our function looks like this:

```js
//  lib/middleware/authentication.js

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
```

Pretty straightforward.  We are passed the token that Passport scarfed out for us, and we do a look up in the User collection by the token to see if we can find a user associated with that token. 

But wait! Where did that 'User.findByToken' function come from?

That is a static method that we added to the User schema via mongoose in lib/models/user.js:

```js
// lib/models/user.js

//create a User.findByToken method
schema.statics.findByToken = function (token, cb) {
  this.findOne({ token: token }, cb);
```

Mongoose has the nice feature of allowing us to add static or instance methods to collections and documents.

Now, finally, let's put up an API endpoint.


```js
//  lib/routes/api.js

//retrieve user, optionally with query
router.get('/users?*', 
    passport.authenticate('bearer', { session: false }), //middleware - api requires authentication
    function (req, res, next) {
    
        // if we get here, the request was authenticated
        User.find(req.query, function (err, users) {
            if (err) return next(err);
            res.json( users ); 
        });
});
```
Note the difference from our earlier routes.  After we provide the uri pattern to match, we provide a middleware function that will be called before our route logic.  We tell passport to protect our endpoint by authenticating using the Bearer method.  This is what will call our authentication middleware, and if the token is not valid a 401 Unauthorized will be returned and our API endpoint logic will not be called.

Let's test it out: first, using an invalid token:

```js
$curl --header "authorization: Bearer 123456789" --include --request GET http://localhost:3000/api/users

HTTP/1.1 401 Unauthorized
X-Powered-By: Express
WWW-Authenticate: Bearer realm="Users", error="invalid_token"
Date: Sat, 28 Mar 2015 02:50:11 GMT
Connection: keep-alive
Transfer-Encoding: chunked
```

OK, now using a valid token:

```js
$curl --header "authorization: Bearer 1234567890" --include --request GET http://localhost:3000/api/users
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 528
ETag: W/"210-1396e08a"
Date: Sat, 28 Mar 2015 03:07:43 GMT
Connection: keep-alive

[{"_id":"5515ec8b7e3e7fb73dbc44d9","__v":0,"date_created":"2015-03-27T23:49:31.883Z","greeting_ids":[]},{"_id":"5515ec9e7e3e7fb73dbc44da","username":"xyz","password":"xyz","first_name":"Dave","last_name":"Horton","token":"1234567890","__v":0,"date_created":"2015-03-27T23:49:50.307Z","greeting_ids":[]},{"_id":"55160819a26a6c27419d3920","username":"xyz","password":"aaa","first_name":"Dave","last_name":"Horton","token":"1234567890","__v":0,"date_created":"2015-03-28T01:47:05.185Z","greeting_ids":["551613e5f43e193542fb001a"]}]
```

It worked!

## For more information

+ [nodejs](https://nodejs.org/api/)
+ [express](http://expressjs.com/)
+ [async](https://github.com/caolan/async)
+ [mongoose](http://mongoosejs.com/)
+ [expressjs Router tutorial](https://scotch.io/tutorials/learn-to-use-the-new-router-in-expressjs-4)
+ [multer](https://github.com/expressjs/multer) multipart/form-data handling
