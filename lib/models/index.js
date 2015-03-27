var glob = require('glob') ;
var mongoose = require('mongoose') ;
var debug = require('debug')('node-examples') ;

//bring in all files in the current directory, 
//camel-casing the filenames to get the associated mongo Document name for each
var files = glob.sync('./*.js', {cwd: __dirname} ) ;
files.forEach( function( f ){ 
    if( './index.js' !== f ) {
        var name = f.slice(2)
            .replace(/(\-[a-z])/g, function($1){return $1.toUpperCase().replace('-','');})
            .replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1);})
            .split('.')
            .shift() ;
        mongoose.model(name, require(f) );
    } 
}) ;
