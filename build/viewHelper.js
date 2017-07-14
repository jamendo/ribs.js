(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    'use strict';
    var ViewHelper;
    (function (ViewHelper) {
        var viewHelpers = {};
        function add(helperName, helperCallback) {
            viewHelpers[helperName] = helperCallback;
        }
        ViewHelper.add = add;
        function remove(helperName) {
            delete viewHelpers[helperName];
        }
        ViewHelper.remove = remove;
        ;
        function get() {
            return viewHelpers;
        }
        ViewHelper.get = get;
        ;
    })(ViewHelper || (ViewHelper = {}));
    return ViewHelper;
});
//# sourceMappingURL=viewHelper.js.map