var mongoose = require('mongoose');

module.exports = mongoose.model('Form',{
    _id: {type: String},
    formdata: {type: Object}
});
