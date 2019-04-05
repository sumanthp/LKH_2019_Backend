var User = require('../models/user');
var Recruiter = require('../models/recruiter');
var Profile  = require('../models/profile');
var jwt = require('jwt-simple');
var moment = require('moment');
var passport = require('passport');
var passport_facebook = require('passport-facebook').Strategy;
var passport_linkedin = require('passport-linkedin');
FacebookStrategy = require('passport-facebook').Strategy;
const {google} = require('googleapis');
const bcrypt = require('bcrypt');
var multer = require('multer');
var statusCodes = require('./statusCodes');
var fs = require('fs');
const googleConfig = {
    clientID: '539355564298-0lfascp1af43b79cks4tt6mdr2ers4h6.apps.googleusercontent.com',
    clientSecret: 'wop5c2pCtr4M8Q3MJSwvRj_9',
    redirect: 'http://localhost:5000/api/google/login/redirect'
}

const defaultScope = [
    'https://www.googleapis.com/auth/plus.me',
    'https://www.googleapis.com/auth/userinfo.email',
];

var nodemailer = require('nodemailer');

var smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth:{
        user: "recruittech2k18@gmail.com",
        pass: "recruit@4"
    }
});

var rand, mailOptions, host, link, emailhash;

function encryptData(data, res){
    var string_data = data.toString();
    console.log(string_data);
    bcrypt.hash(string_data, 10, function(err,value){
        console.log(value);
        if(err){
            console.log("Failed to encrypt Email Hash");
            console.log(err);
            res.status(500).send("{status:False, message:Failed to send verification mail. Try again}");
        }
        else{
            console.log("Encrypted Data:");
            console.log(value);
            return value;
        }
    });
}

function sendEmailVerificationLink(host, user, hash){
            link = "http://"+host+"/verifyEmail?id="+hash;
            mailOptions = {
                to: user,
                subject: "Please Confirm your Email account",
                html: "Hello, <br> Please Click on the Link to verify your Email address. <br>" +  
                        "<a href=" + link + ">Click here to verify</a>"
            };
            console.log(mailOptions);
            smtpTransport.sendMail(mailOptions, function(err, res){
                if(err){
                    console.log(err);
                }else{
                    console.log("Message sent: "+res.message);
                }   
            });
}

function createConnection(){
    return new google.auth.OAuth2(
        googleConfig.clientID,
        googleConfig.clientSecret,
        googleConfig.redirect
    );
}

function getConnectionUrl(auth){
    return auth.generateAuthUrl({
        access_type:'offline',
        prompt: 'consent',
        scope: defaultScope
    });
}

function getGooglePlusApi(auth){
    return google.plus({version:'v1',auth});
}

function createUrl(){
    const auth = createConnection();
    const url = getConnectionUrl(auth);
    return url;
}

async function  getAccountDetails(code){
    try{
        const auth = createConnection();
        const data = await auth.getToken(code);
        const token = data.tokens;
        auth.setCredentials(token);
        const plus = getGooglePlusApi(auth);
        const user = await plus.people.get({userId:'me'});
        const googleUserId = user.data.id;
        const googleUserEmail = user.data.emails && user.data.emails.length && user.data.emails[0].value;
        return{
            id:googleUserId,
            email: googleUserEmail,
            tokens: token,
        };
    }catch(err){
        console.log(err);
    }

}

function validateRegisterParams(data){
    if(data.email!=null && data.firstname!=null && data.lastname!=null && data.password!=null && data.phone!=null && data.dob!=null){
        return true;
    }else{
        return false;
    }
}

function validateRegisterRecruiterParams(data){
    if(data.email!=null && data.companyname!=null && data.gst!=null && data.password!=null && data.phone!=null && data.address!=null){
        return true;
    }else{
        return false;
    }
}

module.exports= {
    register: function (req, res) {
        console.log(req.body);
        if(validateRegisterParams(req.body)){
            User.findOne({email: req.body.email}, function(err, existingUser){
                if(existingUser)
                {
                    console.log("Email already exists in the database");
                    return res.status(409).send({message:"Email is already registered"});
                }
                else{
                    hashPassword(req, res);
                }
            });
        }else{
            res.status(401).send({succes:false, message:"Some of the parameters are not passed"});
        }
    },

    register_recruiter: function (req, res) {
        console.log(req.body);
        if(validateRegisterRecruiterParams(req.body)){
            Recruiter.findOne({Gst: req.body.gst}, function(err, existingCompany){
                if(!existingCompany){
                    Recruiter.findOne({Email: req.body.email}, function(err, existingUser){
                        if(!existingUser)
                        {
                            console.log("Email already exists in the database");
                            return res.status(409).send({message:"Email is already registered"});
                        }
                        else{
                            hashPasswordRecruiter(req, res);
                        }
                    });
                }else{
                    console.log("GST Number exists in the database");
                    return res.status(409).send({message:"GST Number provided is already registered"});
                }
            });
        }else{
            res.status(401).send({succes:false, message:"Some of the parameters are not passed"});
        }
    },

    getUserDetails: function(req, res){
        console.log("Get User Details API");
        var token = req.body.token || req.body.query || req.headers['x-access-token'];
        if(!token){
            res.statusMessage = 'unauthorized: Token not found.';
            res.sendStatus(statusCodes.Denied).end();
        }else{
            try{
                 const decodeToken = jwt.decode(token, 'recruit');
                 res.status(statusCodes.success).send({succes:true, user:decodeToken});
            }catch(e){
                res.statusMessage = "unauthorized: invalid token.";
                res.sendStatus(statusCodes.Denied);
                return;
            }
        }
    },

    getProfile: function(req, res){
        console.log("Get Profile Details of User");
         User.find({Email:req.body.email}, 'FirstName LastName Contact DOB Active', function(err, user){
            if(err){   
                res.status(statusCodes.Denied).send({success:false, message: "User does not exist. Failed to get user details"});
            }
            else{
                getProfileIamge(user);
                res.status(statusCodes.success).send({success:true , message: "User Data : "+user});
            }
        });
    },

    profileImageUpload: function(req, res){
        var profile = new Profile();
        var image = fs.readFileSync(req.files.userImage.path);
        var encode_image = image.toString('base64');
        profile.image.data = new Buffer(encode_image, 'base64');WWW
        profile.image.contentType = req.file.mimetype; 

        Profile.findOneAndUpdate({Email: req.body.email, image: profile.image}, function(err, profile){
            if(err){
                console.log('Profile Image Upload failed: '+err);
                res.status(statusCodes.Denied).status('message: Failed to update profile Iamge, Try Again Later.');
            }
            else{
                console.log('profile Image update success '+profile);
                res.status(statusCodes.success),status('message: Profile Image Updated successfully');
            }
        });
    },

    login: function (req, res) {
        console.log(req.body.email);
        User.findOne({Email: req.body.email}, function(err, user){
           if(!user){
               Recruiter.findOne({Email: req.body.email}, function(err, recruiter){
                if(!recruiter){
                    console.log("Invalid Email or password");
                    return res.status(401).send({message: "Email or Password Invalid"});
                }else{
                    validatePassword(req, recruiter, res);
                   }
               });
           }else{
            validatePassword(req, user, res);
           }
        });
    },

    validateEmailLink: function(req, res){
        console.log(req.protocol + "://" +req.get('host'));
        if((req.protocol + "://" + req.get('host')) == ("http://recruit-apiservices.herokuapp.com")){
            console.log("Domain is matched. Request is from authentic email");
                var user = new User(
                    {
                        Active: true
                    }                      
                );
                User.findOneAndUpdate({EmailHash:req.query.id},  { $set: { Active: true }}, {runValidators:true},
                function(err, user){
                    if(!err){
                        if(user!=null){
                            console.log("Email is verified successfully");
                            res.end("<h1>Email " + user.Email + " is verified successfully");
                        }else{
                            console.log("Email not found in database");
                            res.end("<h1>Email not found in database</h1>");
                        }
                    }else{
                        res.end("<h1>Failed to verify Email. Try again");
                    }
                });
            }else{
                console.log("Failed to verify Email");
                res.end("<h1>Bad Request. Try again</h1>");
            }
    },

    facebookLogin : function(req,res){
        passport.use(new FacebookStrategy({
            clientID:"912201792307025",
            clientSecret:"",
            callbackURL:"",
            profileFields: ['id', 'displayName', 'email']
        },
        function(accessToken, refreshToken, profile, cb){
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
            return cb(null, profile);
        }));
        passport.serializeUser(function(user,cb){
            token = createToken(user);
            cb(null,user.id);
        });
        passport.deserializeUser(function(obj,cb){
            cb(null,obj);
        });
        passport.authenticate('facebook');
    },

    facebook: function(req, res){
        passport.use(new passport_facebook({
            clientID:"",
            clientSecret:"",
            callbackURL:""
        },
        function(accessToken, refreshToken, profile, cb){
            User.findOrCreate({facebookId: profile.id}, function(err,user){
                return cb(err,user);
            })
        }));
        passport.serializeUser(function(user,cb){
            cb(null,user);
        });
        passport.deserializeUser(function(obj,cb){
            cb(null,obj);
        });
    },

    google: function(req, res){
        // passport.use(new passport_google({
        //     clientID: "827184650329-aurntqn7t2djnbv8e2m05jhtqb4vfeed.apps.googleusercontent.com",
        //     clientSecret:"nFmjopJDMDmqkLsF60qiWT7G",
        //     callbackURL:""
        // },
        // function(accessToken, refreshToken, profile, cb){
        //     User.findOrCreate({facebookId: profile.id}, function(err,user){
        //         return cb(err,user);
        //     })
        // }));
        // passport.serializeUser(function(user,cb){
        //     cb(null,user);
        // });
        // passport.deserializeUser(function(obj,cb){
        //     cb(null,obj);
        // });
        var url = createUrl();
        console.log(url);
    },

    googleLoginRedirect : function(req, res){
        var code= req.query.code;
        console.log(code);
        if(code!=null){
            var user = getAccountDetails(code);
            if(user.email!=null){
                User.findOne({email: user.email}).select('name email').exec(function(err, user){
                    if(err){
                        res.status(401).send({succes:false,message:'User email not found'});
                    }
                    res.status(200).send({succes:true,message:'Successfully Authenticated',data:user});
                });
            }
            else{
                res.status(401).send({success:false,message:'Failed to verify google Authentication. Try again'});
            }

        }else{
            res.status(401).send({success:false,message:'Failed to getAccountDetails'});
        }
    },

    linkedin: function(req, res){
        passport.use(new passport_linkedin({
            clientID:"81u0oh0mys638l",
            clientSecret:"wDjHTNB4rzMtzQJv",
            callbackURL:""
        },
        function(accessToken, refreshToken, profile, cb){
            User.findOrCreate({facebookId: profile.id}, function(err,user){
                return cb(err,user);
            })
        }));
        passport.serializeUser(function(user,cb){
            cb(null,user);
        });
        passport.deserializeUser(function(obj,cb){
            cb(null,obj);
        });
    }
};

function createToken(user){
    var payload = {
        sub : user._id,
        name : user.name,
        email : user.email,
        iat: moment().unix(),
        exp: moment().add(24, 'hours').unix()
    };
    return jwt.encode(payload, 'recruit');
}
function validatePassword(req, user, res){
    console.log(user);
    bcrypt.compare(req.body.password, user.Password, function(err, result){
        if(result){
            console.log(req.body.email, user.Password);
            res.status(200).send({
                message: "Welcome back "+user.FirstName,
                token : createToken(user)
            });
        }
        else{
            console.log("Email or Password is wrong");
            return res.status(401).send({message:"Failed to Authenticate User.Try again"});
        }
    })
}

function hashPasswordRecruiter(req, res){
    bcrypt.hash(req.body.password, 10, function(err,hash){
        if(err){
            console.log("Failed to hash the password. Try again");
            req.status(500).send("Failed to encrypt data. Try again");
        }
        else{
            req.body.password = hash;
            rand = Math.floor((Math.random() * 100) + 54);
            host = req.get('host');
            sendEmailVerificationLink(host, req.body.email, rand);
            var recruiter = new Recruiter({
                CompanyName : req.body.companyname,
                Email : req.body.email,
                Password : req.body.password,
                Contact : req.body.phone,
                Address : req.body.address,
                Gst : req.body.gst,
                Active : false,
                EmailHash : rand,
                created_at : new Date(),
                updated_at : new Date()
            });
            recruiter.save(function (err, result) {
                if (err) {
                    console.log(err);
                    res.status(500).send({
                        message: err.message
                    });
                }
                res.status(200).send({message: "User Registered Successfully. Please verify your Email. Email send to your mail id", token: createToken(recruiter)});
            });
        }
    })
}
function getProfileIamge(user){
    profile.findOne({_id:user._id},'Image',function(err, result){
        if(err){
            res.status(401).send({success:false, message:'profile Image is not available for the user'});
        }else{
            res.status(200).send({succes:true, message:result});
        }
    });
}

function hashPassword(req, res){
    bcrypt.hash(req.body.password, 10, function(err,hash){
        if(err){
            console.log("Failed to hash the password. Try again");
            req.status(500).send("Failed to encrypt data. Try again");
        }
        else{
            req.body.password = hash;
            rand = Math.floor((Math.random() * 100) + 54);
            host = req.get('host');
            sendEmailVerificationLink(host, req.body.email, rand);
            var user = new User({
                FirstName : req.body.firstname,
                LastName : req.body.lastname,
                Email : req.body.email,
                Password : req.body.password,
                Contact : req.body.phone,
                DOB : new Date(req.body.dob),
                Active : false,
                EmailHash : rand,
                created_at : new Date(),
                updated_at : new Date()
            });
            user.save(function (err, result) {
                if (err) {
                    console.log(err);
                    res.status(500).send({
                        message: err.message
                    });
                }
                res.status(200).send({message: "User Registered Successfully. Please verify your Email. Email send to your mail id", token: createToken(user)});
            });
        }
    })
}