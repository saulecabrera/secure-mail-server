//import  the concerning model here and operate it!
var express = require('express');
var router = express.Router();
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
/* GET users listing. */
router.get('/:username/dashboard', ensureLoggedIn('/'), function(req, res) {
	res.render('dashboard', {
		user: req.user,
		title: "sms - " + req.user.emailAddress.split('@')[0] + "'s dashboard",
		layout: 'main_layout' 
	})
});

module.exports = router;
