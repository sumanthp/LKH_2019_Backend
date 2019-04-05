var mongoose = require('mongoose');

module.exports = mongoose.model('Recruiter', {
    CompanyName: {type: String, required:true},
    Email: {type: String, required: true, unique: true},
    Password: {type: String, required: true},
    Contact : {type: Number, required: true},
    Address: {type: String, required:true},
    Gst: {type: Number, required: true, unique: true},
    Active: {type: Boolean, required: true},
    EmailHash: {type: String, required: true, unique: true},
    created_at: Date,
    updated_at: Date
});