(function () {
    'use strict';

    WinJS.Namespace.define('Converters', {
        // Convert # of listens to appropriate class
        listensToClass: WinJS.Binding.converter(function (listens) {
            return listens ? 'finished' : '';
        })
    });

})();
