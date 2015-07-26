(function ($, _) {
    'use strict';

    // Parse XML for episode items.
    var _getEpisodesFromXml = function(xml) {
        return new WinJS.Promise(function (comp, err, prog) {
            var _episodes = [];
            var defaults = {
                currentTime: 0.0,
                duration: 0.0,
                listens: 0
            };
            $(xml).find('item').each(function () {
                var $episode = $(this);
                var fullTitle = $episode.find('title').text();
                var title = fullTitle.split(": ")[1];
                var episodeNumber = fullTitle.split(": ")[0];
                var description = $episode.find('description').text();
                var mediaUrl = $episode.find('enclosure') ? $episode.find('enclosure').attr('url') : null;
                _episodes.push(_.defaults({
                    title: title,
                    number: episodeNumber,
                    description: description,
                    mediaUrl: mediaUrl
                }, defaults));
            });
            comp(_episodes);
        });
    }

    // XHR request for Feed XML.
    function getEpisodes() {
        return new WinJS.Promise(function (comp, err, prog) {
            WinJS.xhr({
                url: 'http://feeds.feedburner.com/SModcasts',
            }).done(function (request) {
                if (request.status === 200) {
                    _getEpisodesFromXml(request.response).done(comp);
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
        feed: {
            title: '',
            episodes: []
        },
        getEpisodes: getEpisodes
    });

})(jQuery, _);