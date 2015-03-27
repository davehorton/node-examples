var glob = require('glob') ;
var debug = require('debug')('node-examples') ;

//include all the routes in the current directory
module.exports = function(app, config) {
    var files = glob.sync('./*.js', {cwd: __dirname}) ;
    files.forEach( function( f ){
        if( './index.js' !== f ) {
            require(f)(app, config) ;
        }
    });
}
