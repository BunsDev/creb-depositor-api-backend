var mongoose = require('mongoose');

var config = require('../config/index');

mongoose.Promise = global.Promise;
mongoose.set('debug', true);
// Connect to database
const dbURI = config.MONGOURL;
mongoose.connect(dbURI, {useNewUrlParser: true,useUnifiedTopology: true});
mongoose.connection.on('error', function(err) {
	console.error('MongoDB connection error: ' + err);
	process.exit(-1);
	}
);