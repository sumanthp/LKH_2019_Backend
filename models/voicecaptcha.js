var mongoose = require('mongoose');

module.exports = mongoose.model('VoiceCaptcha',{
    _id: {type: String},
    data: {type: String}
});
