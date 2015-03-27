var mongoose = require('mongoose') ;
var Schema = mongoose.Schema ;

var schema = new mongoose.Schema({
    username: String,
    password: String,
    first_name: String,
    last_name: String,
    token: String,
    greeting_ids: [{type: Schema.Types.ObjectId, ref: 'Greeting'}],
    date_created: {type: Date, 'default': Date.now },
}) ;

//create a User.findByToken method
schema.statics.findByToken = function (token, cb) {
  this.findOne({ token: token }, cb);
}


module.exports = schema; 
