var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var timestamps = require('mongoose-timestamp');
var User = require('./user');

var MailObjectSchema = new Schema({
	subject: String,
	body: String,
	sender: {type: Schema.Types.ObjectId, ref: 'User', required: true}, //from
	receiver: {type: String, required: true} //to
});

MailObjectSchema.plugin(timestamps);
module.exports = mongoose.model('MailObject', MailObjectSchema);