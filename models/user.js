var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
var uniqueValidator = require('mongoose-unique-validator');
var timestamps = require('mongoose-timestamp');
//needed models
var MailObject = require('./mail_object');
var Contact = require('./contact');
var Log = require('./log');

var UserSchema = new Schema({
	firstName: {type: String, required: true},
	lastName: {type: String, required: true},
	emailAddress: {type: String, unique: true, match: /\S+@sms.com/},
	salt: {type: String, required: true},
	hash: {type: String, required: true},
	mailObjects:[{type: Schema.Types.ObjectId, ref: 'MailObject'}],
	contacts: [{type: Schema.Types.ObjectId, ref: 'Contact'}],
	logs: [{type: Schema.Types.ObjectId, ref: 'Log'}]
});

UserSchema.plugin(uniqueValidator);
UserSchema.plugin(timestamps);

UserSchema.virtual('password').get(function(){
	return this._password;
}).set(function(password){
	this._password = password;
	var salt = this.salt = bcrypt.genSaltSync(10);
	this.hash = bcrypt.hashSync(password, salt);
});

UserSchema.method('validatePassword', function(){
	bcrypt.compare(password, this.hash, callback);
});

UserSchema.static('authenticate', function(email, password, callback){
	this.findOne({emailAddress: email}, function(err, user){
		if(err)
			return callback(err);
		if(!user)
			return callback(null, false);
		user.validatePassword(password, function(err, correctPassword){
			if(err)
				return callback(err);
			if(!correctPassword)
				return callback(null, false);
			return callback(null, user);
		});
	});
});

module.exports = mongoose.model('User', UserSchema);