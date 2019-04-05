var mongoose = require('mongoose');

module.exports = mongoose.model('User', {
    FirstName: {type: String, required:true},
    LastName: {type: String, required:true},
    Email: {type: String, required: true, unique: true},
    Password: {type: String, required: true},
    Contact : {type: Number, requried:true},
    Age: Number,
    DOB: {type: Date, required: true},
    location: {type: String},
    Active: {type: Boolean, required: true},
    EmailHash: {type: String, required: true, unique: true},
    created_at: Date,
    updated_at: Date,
});