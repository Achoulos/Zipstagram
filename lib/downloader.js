var request = require('request'),
	fs = require("fs"),
	archiver = require('archiver'),
	async = require('async'),
	rimraf = require('rimraf');

//archives folder with images as a .zip file
var archive = function (n, res, token) {
	var output = fs.createWriteStream(token + '.zip');
	var archive = archiver('zip');

	output.on('close', function() { 

		console.log('zipped up ' + n + ' photos!');
		res.redirect('http://zipstagram.herokuapp.com/downloads');
	 });
	archive.on('error', function(err) { throw err });

	archive.pipe(output);

	archive.bulk([
  	{ expand: true, cwd: token, src: ['**/*'] }
	]).finalize();
};

//downloads individual images from Instagram
var downloader = function (uri, filename, token, callback) {
  	request.head(uri, function(err, res, body){
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(token + '/' + filename)).on('close', callback);
  });
};

//coordinates downloading and archiving
var helper = function (json, callback, res, token) {
	fs.mkdir(token, function() {
		var done = 0;
		var count = 0;
		var i = 0;

		async.whilst(function() {
			return json.data[i] !== undefined;
		},
		function (next)	{
			count++;
			downloader(json.data[i].images.standard_resolution.url, (json.data[i].id + ".jpg"), token, function () {
				done++;
				console.log("done?: " + done);
				console.log("counter: " + count);
				if (done === count) {
					callback((i+1), res, token);	
				}
			});
			i++;
			next();
		},
		function (err) {
			console.log('done');
		});
	});
};

module.exports.download = function(req, res, next) {
	var token = req.cookies.token;
	//"-1" is passed in as the "count" so Instagram returns ALL liked photos
	var url = 'https://api.instagram.com/v1/users/self/media/liked?access_token=' + token + '&count=-1';

	request({
		url: url,
		json:true
	}, function (error, response, body) {
		 if (!error && response.statusCode === 200) {
		 	helper(body, archive, res, token);
    	}
	});
};

//simple check to see if access token exists
exports.isAuthenticated = function(req, res, next) {
  if (req.cookies.token != undefined) {
  		return next();
  }
  else {
  	res.redirect('/auth/instagram');
  }
};
