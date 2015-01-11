(function ($, _) {
    'use strict';

    var feed = {
        episodes: []
    };
    var SMODCAST_URL = 'http://smodcast.com/channels/smodcast/feed/';
    var options = {
        url: SMODCAST_URL,
        responseType: 'document'
    };

    var _getEpisodesFromXml = function(xml) {
        return new WinJS.Promise(function (comp, err, prog) {
            var episodes = $(xml).find('item');
            var _episodes = [];

            try {
                _.each(episodes, function (episode, i) {
                    var $episode = $(episode);
                    var fullTitle = $episode.find('title').text();
                    var title = fullTitle.split(": ")[1];
                    var episodeNumber = (episodes.length - 1) - i;
                    var descriptionNode = $episode.find('description').html();
                    var description = descriptionNode.replace("<!--[CDATA[", "").replace("]]-->", ""); // NOTE: SmodCo RSS feeds are weirdly formatted
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
                }, this);
                comp(_episodes);
            }
            catch (e) {

            }
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