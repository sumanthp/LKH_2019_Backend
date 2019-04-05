var User = require('../models/user');
var Recruiter = require('../models/recruiter');
var jwt = require('jwt-simple');
var moment = require('moment');
const bcrypt = require('bcrypt');
var fs = require('fs');
var mongoose = require('mongoose');
var conn = mongoose.connection;
var nodemailer = require('nodemailer');
var Form = require('../models/form');
const uuidv1 = require('uuid/v1');
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

  uploadFormDetails: function(req, res){
    console.log("Upload form details");
    console.log("Formdata: "+req.body.formdata);
    console.log("id: "+req.body.formid);
    var input = JSON.parse(req.body.formdata);
    var id = req.body.formid;
    var result = validateFormData(input, id);
    if(result){
        const collection = conn.collection('FormCollection');
        var formdata = new Form({
            _id: id,
            formdata: input
        });
       collection.insert(formdata, function(err, result){
            if(err || result==null){
                res.status(401).send({success:false, message:"Failed to Store Form data"});
            }else{
                res.status(200).send({success:true, message:"Successfully Stored Form Data"});
            }
        });
    }else{
        res.status(401).send({success:true, message: "Formdata is not in correct format"});
    }
  },

  retrieveFormDetails: function(req, res){
    var uuid = uuidv1();
    console.log("Unique Id Generated: "+uuid);
    console.log("Retreive Form Details for id : "+req.query.id);
    if(validateFormId(req.query.id)){
        const collection = conn.collection('FormCollection');
        collection.findOne({_id:req.query.id}, 'formdata', function(err, result){
            if(err || result==null || uuid==null){
                res.status(401).send({success:false, message:"Failed to retreive Form data"});
            }else{
                var data = JSON.stringify(result.formdata);
                console.log("Result : "+data);
                res.status(200).send({success:true, message:data, id:uuid});
            }
        });
    }else{
        res.status(401).send({success:true, message: "Form Id is not available"});
    }
  }

};

function validateFormId(id){
    if(id!=null && id!=''){
        return true;
    }else{
        return false;
    }
}

function validateFormData(input, id){
    if(input!=null && input!='' && id!=null && id!=''){
        return true;
    }else{
        return false;
    }
}

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