var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var uniqueValidator = require('mongoose-unique-validator');
var timestamps = require('mongoose-timestamp');
var User = require('./user');

var ContactUserSchema = new Schema({
	user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
	firstName: String,
	lastName: String,
	emailAddress: String //not validated because its not important really
});

ContactUserSchema.plugin(uniqueValidator);
ContactUserSchema.plugin(timestamps);

module.exports = mongoose.model('ContactUser', ContactUserSchema);