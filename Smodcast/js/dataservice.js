(function () {
    "use strict";

    var feed = {
        episodes: []
    };

    var SMODCAST_URL = "http://smodcast.com/channels/smodcast/feed/";
    var options = {
        url: SMODCAST_URL,
        responseType: 'document'
    };

    // Get Episodes from XML
    var _getEpisodesFromXml = function(xml) {
        return new WinJS.Promise(function (comp, err, prog) {
            var episodes = xml.querySelectorAll("item");
            var _episodes = [];

            try {
                // Parse attributes
                for (var i = 0; i < episodes.length; i++) {
                    var episode = episodes[i];

                    // Get episode title without 'Smodcast ###: ' prefix
                    var fullTitle = episode.querySelector("title").textContent;
                    var title = fullTitle.split(": ")[1];
                    var episodeNumber = (episodes.length - 1) - i;

                    var descriptionNode = episode.querySelector("description").innerHTML;
                    var description = descriptionNode.replace("<!--[CDATA[", "").replace("]]-->", ""); // NOTE: Sigh.. libsyn changed its RSS feed format.
                    var mediaUrl = episode.querySelector("enclosure") ? episode.querySelector("enclosure").getAttribute("url") : null;
                    var published = episode.querySelector("pubDate").textContent;

                    // Convert the date for display
                    var episodeDate = new Date(published);

                    var monthFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("month.abbreviated");
                    var dayFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("day");
                    var yearFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("year.full");

                    var month = monthFmt.format(episodeDate);
                    var day = dayFmt.format(episodeDate);
                    var year = yearFmt.format(episodeDate);

                    _episodes.push({
                        group: feed,
                        key: feed.title,
                        title: title,
                        number: episodeNumber,
                        description: description,
                        mediaUrl: mediaUrl,
                        published: published,
                        month: month,
                        day: day,
                        year: year,
                        currentTime: 0.0,
                        duration: 0.0,
                        listens: 0
                    });
                }
                comp(_episodes);
            }
            catch (e) {
                err(e);
            }
        });
    }

    function getEpisodes() {
        return new WinJS.Promise(function (comp, err, prog) {
            WinJS.xhr(options).done(function (request) {
                if (request.status === 200) {
                    var xml = request.response;
                    feed.title = xml.querySelector("rss > channel > title").textContent;

                    // Use the date of the latest post as the last updated date
                    //var published = xmlDocument.querySelector("feed > entry > published").textContent;
                    // Convert the date for display
                    //var date = new Date(published);
                    //var dateFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("month.abbreviated day year.full");
                    //var blogDate = dateFmt.format(date);
                    //feed.updated = "Last updated " + blogDate;
                    _getEpisodesFromXml(xml).done(function (episodes) {
                        comp(episodes)
                    });
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

})();