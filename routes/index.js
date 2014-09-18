var express = require('express');
var router = express.Router();
var passport = require('passport');
var User = require('../models/user');
var TwitterStrategy = require('passport-twitter').Strategy
/* GET home page. */
router.get('/', function(req, res) {
	//for further gets even when the user is logged in
	res.render('index', {
		title: 'secure mail server',
		layout: 'main_layout',
		user: req.user
	});
});

//this comment is to check sinc
router.get('/auth/twitter', passport.authenticate('twitter'));

router.get('/auth/twitter/callback',
	passport.authenticate('twitter', {
		failureRedirect: '/'
	}),
	function(req, res) {
		res.redirect('/u/' + req.user.emailAddress.split('@')[0] + '/dashboard');
	}
);

router.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

passport.use(new TwitterStrategy({
		consumerKey: "v5e467m9Nk9Uo8fv4Xaezw",
		consumerSecret: "jlCnhwBRIsPYLyy7qZLx1ePPm7E3Zv5vq2MIB2fw",
		callbackURL: "http://secure-mail-server-147127.use1.nitrousbox.com/auth/twitter/callback"
	},
	function(token, tokenSecret, profile, done) {
		User.findOne({
			uid: profile.id
		}, function(err, user) {
			if (user) {
				done(null, user);
			} else {
				var user = new User();
				user.provider = "twitter";
				user.uid = profile.id;
				user.name = profile.displayName;
				user.emailAddress = profile.username + "@sms.com";
				user.save(function(err) {
					if (err) {
						throw err;
					}
					done(null, user);
				});
			}
		})
	}
));


passport.serializeUser(function(user, done) {
	done(null, user.uid);
});

passport.deserializeUser(function(uid, done) {
	User.findOne({
		uid: uid
	}, function(err, user) {
		done(err, user);
	});
});

module.exports = router;