(function ($, _) {
    'use strict';

    var feed = {
        episodes: []
    };
    var SMODCAST_URL = 'http://feeds.feedburner.com/SModcasts';
    var options = {
        url: SMODCAST_URL,
        responseType: 'document'
    };

    var _getEpisodesFromXml = function(xml) {
        return new WinJS.Promise(function (comp, err, prog) {
            var _episodes = [];
            $(xml).find('item').each(function () {
                var $episode = $(this);
                var fullTitle = $episode.find('title').text();
                var title = fullTitle.split(": ")[1];
                var episodeNumber = fullTitle.split(": ")[0];
                var description = $episode.find('description').text();
                var mediaUrl = $episode.find('enclosure') ? $episode.find('enclosure').attr('url') : null;
                _episodes.push({
                    group: feed,
                    key: feed.title,
                    title: title,
                    number: episodeNumber,
                    description: description,
                    mediaUrl: mediaUrl,
                    currentTime: 0.0,
                    duration: 0.0,
                    listens: 0
                });
            });
            comp(_episodes);
        });
    }

    function getEpisodes() {
        return new WinJS.Promise(function (comp, err, prog) {
            WinJS.xhr(options).done(function (request) {
                if (request.status === 200) {
                    var xml = request.response;
                    feed.title = xml.querySelector('rss > channel > title').textContent;
                    _getEpisodesFromXml(xml).done(comp);
                }
            })
        });
    };

    /**
     * Extract episode number from its title
     */
    function _getNumberFromString(title) {
        return title.match(/\d+/)[0];
    };

    WinJS.Namespace.define("DataService", {
        feed: feed,
        getEpisodes: getEpisodes
    });

})(jQuery, _);