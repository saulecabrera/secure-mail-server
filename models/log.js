var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var timestamps = require('mongoose-timestamps');
var User = require('./user');

var LogSchema = new Schema({
	action: {type: String, required: true},
	location: String,
	user: {type: Schema.Types.ObjectId, ref: 'User'}
});

LogSchema.plugin(timestamps);

module.exports = mongoose.model('Log', LogSchema);