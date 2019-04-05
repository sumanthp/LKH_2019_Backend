FacebookStrategy = require('passport-facebook').Strategy;
var User = require('../models/user');
var session = require('express-session');
var jwt = require('jsonwebtoken');
var secret = 'recruit';
var bodyParser = require('body-parser');
module.exports = function(app, passport) {
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(function(req,res,next){
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "x-auth, Content-Type, Authorization, x-access-token");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        next();
     });
    app.use(session(
        {
            secret: 'keyboard cat',
            resave:false,
            saveUninitialized:true,
            cookie:{secure:false}
        }
        ));
    app.use(passport.initialize())
    app.use(passport.session());
    passport.use(new FacebookStrategy({
        clientID:"912201792307025",
        clientSecret:"",
        callbackURL:"",
        profileFields: ['id', 'displayName', 'email']
    },
    function(accessToken, refreshToken, profile, cb){
        // User.findOrCreate({facebookId: profile.id}, function(err,user){
        //     return cb(err,user);
        // })
        User.findOne({email: profile._json.email}).select('name password email').exec(function(err, user){
            if(err){
                cb(err);
            }
            if(user && user!=null){
                cb(null,user);
            }else{
                cb(err);
            }
        });
        console.log(profile);
        cb(null, profile);
    }));
    passport.serializeUser(function(user,cb){
        token = jwt.sign({username: user.name, email: user.email}, secret, {expiresIn: '24h'});
        cb(null,user.id);
    });
    passport.deserializeUser(function(obj,cb){
        cb(null,obj);
    });
    // // app.route('/auth/facebook/callback', passport.authenticate('facebook', {failureRedirect:'/login'}), function(req, res){
    //     // res.redirect('/facebook/' + token);
    //     res.send(token);
    // });
    // app.route('/auth/facebook', passport.authenticate('facebook, {scope:email}'));
    // return passport;
}