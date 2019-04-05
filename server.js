var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var auth = require('./controllers/auth');
var jwt = require('jsonwebtoken');
const {port, connectionstring} = require('./config');
console.log(`Port No : ${port}`);
console.log(`Mongodb Connection string : ${connectionstring}`);
mongoose.connect(connectionstring,  { useNewUrlParser: true }, function(err,db){
    if(!err){
        console.log("Successfully conencted to mongodb");
        database = db;
    }else{
        console.log("Failed to connect to Mongodb");
    }
});
var conn = mongoose.connection;
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(function(req,res,next){
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "x-auth, Content-Type, Authorization, x-access-token");
   res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
   res.setHeader('Access-Control-Allow-Credentials', true);
   next();
});
app.route('/api/create').post(auth.uploadFormDetails);
app.route('/api/retrieve').get(auth.retrieveFormDetails);
app.route('/api/storeWords').post(auth.storeVoiceCaptchaWords);
app.route('/api/retrieveWords').get(auth.retrieveVoiceCaptchaWords);
var server = app.listen((process.env.PORT || port), function (req, res) {
    console.log("Listening on port",server.address().port);
});