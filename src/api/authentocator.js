const jwt = require('jsonwebtoken');

var config = require('../config/index');

//generating jwt token
var generateAuthToken = function (id, email) {
    return jwt.sign({ id: id, email: email }, config.SECRET)
};

//validate token
var verifyToken = function (req, res, next) {

    // check header or url parameters or post parameters for token
    let token = req.body.token || req.query.token || req.headers['x-access-token'];
    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, config.SECRET, function (err, decoded) {
            if (err) {
                return res.json({
                    result: false,
                    message: 'Failed to authenticate token.'
                });
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                req.token = token;
                next();
            }
        });

    } else {
        // if there is no token
        // return an error
        return res.status(403).json({
            result: false,
            message: 'No token provided.'
        });

    }

};


//method to authenticate user
module.exports = { generateAuthToken, verifyToken };