var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'secure mail server', layout:'main_layout'});
});

router.get('/signup', function(req, res){
	res.render('signup', {title: 'secure mail server - signup'})
});

module.exports = router;
