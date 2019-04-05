module.exports = {
    Success: function(){
        return 200;
    },

    Denied: function(){
        return 401;
    },

    Error: function(){
        return 500;
    }
};
