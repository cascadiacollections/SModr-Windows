(function () {
    "use strict";

    var feed = {
        episodes: []
    };

    var SMODCAST_URL = "http://smodcast.com/channels/smodcast/feed/";
    var options = {
        url : SMODCAST_URL
    };

    // Get Episodes from XML
    var _getEpisodesFromXml = function (xml) {
        var episodes = xml.querySelectorAll("item");
        // Process each blog post
        for (var i = 0; i < episodes.length; i++) {
            var episode = episodes[i];

            // Get the title, author, and date published
            var title = episode.querySelector("title").textContent;
            var description = episode.querySelector("description").textContent;
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

            // Store the post info we care about in the array
            Smodr.episodesList.push({
                group: feed,
                key: feed.title,
                title: title,
                description: description,
                mediaUrl: mediaUrl,
                published: published,
                month: month,
                day: day,
                year: year
            });
        }
    };

    WinJS.xhr(options).done(
        function completed(request) {
            // XML fetched successfully
            if (request.status === 200) {
                // Get the XML document from the results. 
                var xmlDocument = request.responseXML;

                // Get the blog title 
                feed.title = xmlDocument.querySelector("rss > channel > title").textContent;

                // Use the date of the latest post as the last updated date
                //var published = xmlDocument.querySelector("feed > entry > published").textContent;
                // Convert the date for display
                //var date = new Date(published);
                //var dateFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("month.abbreviated day year.full");
                //var blogDate = dateFmt.format(date);
                //feed.updated = "Last updated " + blogDate;

                // Get the episodes
                _getEpisodesFromXml(xmlDocument);
            }
        },
        function error(request) {
            // XML not fetched, error.
            console.error("Error fetching XML.");
        }, 
        function progress(request) {
            // Report on progress of download.
        });

    WinJS.Namespace.define("DataService", {
        feed: feed
    });
})();