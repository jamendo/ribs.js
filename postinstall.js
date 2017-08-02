var copy = require('copy');

copy('./typings/backbone/index.d.ts', './node_modules/@types/backbone/', {flatten: true}, function(err, files) {
    if (err) {
        throw err;
    }
});