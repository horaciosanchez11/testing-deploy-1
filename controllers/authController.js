const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
	failureRedirect: '/login',
	failureFlash: 'Failed Login',
	successRedirect: '/',
	successFlash: 'You are now logged in'
});

exports.logout = (req, res) => {
	req.logout();
	req.flash('success', 'You are now logged out');
	res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
	if (req.isAuthenticated()) {
		next(); // carry on, it is logged in
		return;
	}
	req.flash('error', 'You must be logged in to do that');
	res.redirect('/login');
}

exports.forgot = async (req, res) => {
	// 1. see if user exists
	const user = await User.findOne({email: req.body.email});
	if (!user) {
		//req.flash('error', 'No account with that email exists');
		req.flash('error', 'A password reset has been mailed to you');
		return res.redirect('/login');
	}
	// 2. set reset tokens and expiry on their account
	user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
	user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
	await user.save();
	// 3. send email with the token
	const resetUrl = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
	//VIDEO 28
	await mail.send({
		user: user,
		subject: 'Password Reset',
		resetUrl,
		filename: 'password-reset'
	});
	req.flash('success', 'You have been emailed a password link');
	//req.flash('success', `An email has been sent to you ${resetUrl}`);
 	
 	// 4. redirect to login page after token email has been sent
 	res.redirect('/login');
}

exports.reset = async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: { $gt: Date.now() }
	});

	if (!user) {
		res.flash('error', 'Invalid token');
		return res.redirect('/login');
	}
	// if there is user, show reset password form
	res.render('reset', {title: 'Reset Password'});
}

exports.confirmedPassword = (req, res, next) => {
	if (req.body.password === req.body['password-confirm']) {
		next();
		return;
	}
	req.flash('error', 'Passwords do not match');
	res.redirect('back');
}

exports.update = async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: { $gt: Date.now() }
	});

	if (!user) {
		res.flash('error', 'Invalid token');
		return res.redirect('/login');
	}

	//user.setPassword();	
	const setPassword = promisify(user.setPassword, user);
	await setPassword(req.body.password);
	user.resetPasswordToken = undefined;
	user.resetPasswordExpires = undefined;
	const updatedUser = await user.save();
	await req.login(updatedUser);
	req.flash('success', 'Your password has been reset');
	res.redirect('/');
}