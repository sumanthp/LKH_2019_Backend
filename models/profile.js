var mongoose = require('mongoose');

module.exports = mongoose.model('Profile',{
    id: {type: String},
    Email: {type: String},
    image: {data: Buffer, contentType: String},
    resume: {type: Buffer, contentType: String},    
})
