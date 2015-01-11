/**
 * Kevin Coughlin <kevintcoughlin@gmail.com>
 */
(function () {
    'use strict';

    WinJS.Namespace.define('Converters', {
        /**
         * Convert current time and duration to human
         * readable string.
         */
        toHumanReadableDuration: WinJS.Binding.converter(function (model) {
            if (model.currentTime <= 0) return "";
            if (model.currentTime >= model.duration) return "";

            var seconds = Math.floor(model.duration - model.currentTime);
            var remaining = seconds * 1000;
            return humanizeDuration(remaining);
        }),

        /**
         * Convert # of listens to appropriate class
         */
        listensToClass: WinJS.Binding.converter(function (listens) {
            return listens === 0 ? 'finished' : '';
        })
    });

})();
