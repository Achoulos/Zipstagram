var express = require('express'),
	passport = require('passport'),
	InstagramStrategy = require('passport-instagram').Strategy,
	secret = require('./lib/secret'),
	downloader = require('./lib/downloader'),
	fs = require('fs'),
	rimraf = require('rimraf'),
	cookieParser = require('cookie-parser'),
	session = require('express-session');

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});

//define Instagram strategy to store access token
passport.use(new InstagramStrategy({
		clientID: secret.instagram.INSTAGRAM_CLIENT_ID,
		clientSecret: secret.instagram.INSTAGRAM_CLIENT_SECRET,
		callbackURL: "http://zipstagram.herokuapp.com/auth/instagram/callback"
	},
	function(accessToken, refreshToken, profile, done) {
		app.locals.token = accessToken;
		process.nextTick(function () {
			return done(null, profile);
		});
	}
));

var app = express();

app.set('port', process.env.PORT || 8000);
app.use(cookieParser());
app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));

var server = require('http').Server(app);

server.listen(app.get('port'), function () {
   console.log('Express server listening on port ' + app.get('port'));
});

app.get('/', function(req, res){
	res.redirect('/index.html');
});

app.get('/about', function(req, res){
	res.redirect('/about.html');
});

//route that calls downloader.js
app.get('/download/', downloader.download);

//return route from downloader.js
app.get('/downloads', function(req, res)
{
	var options = {
		root: __dirname,
		dotfles: 'deny',
		headers: {
			'x-timestamp' : Date.now(),
			'x-sent': true
		}
	};

	res.sendFile(app.locals.token + '.zip', options, function (err) {
		if (err) {
      		console.log(err);
      		res.status(err.status).end();
   		 }
   		 else {
				rimraf(app.locals.token, function () {
				fs.unlink(app.locals.token + '.zip', function () {
					console.log('files cleared');
				});
			});
		}
	});
});

//main button route
app.get('/instagram', downloader.isAuthenticated, function (req, res) {
	res.redirect('/download');
});

app.get('/auth/instagram', passport.authenticate('instagram'));

app.get('/auth/instagram/callback',
	passport.authenticate('instagram', { failureRedirect: 'http://zipstagram.herokuapp.com' }),
	function(req, res) {
		res.cookie('token', app.locals.token, { maxAge: 90000, httpOnly: false});
		res.redirect('/');
	});

app.use(function(req, res, next){
    res.status(404);
    res.redirect('/404.html')
});
