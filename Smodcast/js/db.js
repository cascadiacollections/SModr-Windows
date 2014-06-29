/**
 * @author Kevin Coughlin <kevintcoughlin@gmail.com>
 */
var database = (function () {
    'use strict';

    var _name = 'history';
    var db = new PouchDB(_name);
    var remoteCouch = '';

    var _insert = function(episode) {
        return db.put(episode);
    };

    // TODO: Move to _insert?
    var _batchInsert = function (episodes) {
        return db.bulkDocs({
            docs: episodes
        });
    };

    var _all = function() {
        return db.allDocs({
            include_docs: true,
            descending: true
        });
    };

    var _update = function(episode) {
        return db.put(episode);
    };

    var _remove = function(episode) {
        return db.remove(episode);
    };

    var _sync = function(onComplete) {
        var options = {
            live: true,
            complete: onComplete
        };
        db.replicate.to(remoteCouch, options);
        db.replicate.from(remoteCouch, options);
    };

    var _clear = function () {
        return db.destroy();
    };

    return {
        insert: _insert,
        batchInsert: _batchInsert,
        update: _update,
        remove: _remove,
        all: _all,
        sync: _sync,
        clear: _clear
    };

})();