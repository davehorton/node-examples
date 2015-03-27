var path = require('path') ;

var config = {
    app: {
      name: 'node-examples'
    },
    port: 3000,
    db: 'mongodb://localhost/node-examples',
    greetingPath: path.join(__dirname,'recordings','transcoded')

};

module.exports = config ;
