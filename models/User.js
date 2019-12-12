const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema ({
	email: {
		type: String,
		unique: true,
		lowercase: true,
		trim: true,
		validate: [validator.isEmail, 'Invalid email address'],
		required: 'Please supply an email address'
	},
	name: {
		type: String,
		trim: true,
		required: 'Please supply a name'
	},
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	hearts: [
		{
			type: mongoose.Schema.ObjectId,
			ref: 'Store'
		}
	]
});

userSchema.virtual('gravatar').get(function() {
	//return 'https://www.google.com/url?sa=i&source=images&cd=&ved=2ahUKEwip_MTg_OLlAhUE11kKHcJXDmgQjRx6BAgBEAQ&url=https%3A%2F%2Fwww.w3schools.com%2Fhowto%2Fhowto_css_image_avatar.asp&psig=AOvVaw0xxXO8Wb866Enm8rRCA0pU&ust=1573589746255252';
	const hash = md5(this.email);
	return `https://gravatar.com/avatar/${hash}?s=200`;
});

userSchema.plugin(passportLocalMongoose, {usernameField: 'email'});
userSchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model('User', userSchema);