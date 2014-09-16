var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
var uniqueValidator = require('mongoose-unique-validator');
var timestamps = require('mongoose-timestamp');
	//needed models
var MailObject = require('./mail_object');
var Contact = require('./contact_user');
var Log = require('./log');

var UserSchema = new Schema({
	provider: String,
	uid: String,
	name: {
		type: String,
		required: true
	},
	emailAddress: {
		type: String,
		unique: true,
		match: /\S+@sms.com/
	},
	mailObjects: [{
		type: Schema.Types.ObjectId,
		ref: 'MailObject'
	}],
	contacts: [{
		type: Schema.Types.ObjectId,
		ref: 'Contact'
	}],
	logs: [{
		type: Schema.Types.ObjectId,
		ref: 'Log'
	}]
});

UserSchema.plugin(uniqueValidator);
UserSchema.plugin(timestamps);
var User = mongoose.model('User', UserSchema);

module.exports = User;