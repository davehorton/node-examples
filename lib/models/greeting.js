var mongoose = require('mongoose') ;
var Schema = mongoose.Schema ;

var schema = new mongoose.Schema({
    name: String,
    folder_location: String,
    date_created: {type: Date, 'default': Date.now },
}) ;

module.exports = schema; 