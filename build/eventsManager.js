(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "backbone", "underscore"], factory);
    }
})(function (require, exports) {
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    var Backbone = require("backbone");
    var _ = require("underscore");
    var CEventsManager = /** @class */ (function () {
        function CEventsManager() {
            this.constants = {
                // router
                'ROUTER_PREROUTE': 'router:preRoute',
                'ROUTER_POSTROUTE': 'router:postRoute'
            };
        }
        return CEventsManager;
    }());
    exports.EventsManager = _.extend(new CEventsManager(), Backbone.Events);
    exports.default = exports.EventsManager;
});
//# sourceMappingURL=eventsManager.js.map