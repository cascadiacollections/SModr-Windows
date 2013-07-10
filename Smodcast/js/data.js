/**
 * Smodcast-Win8 - Data Sources and Service
 * 
 */
(function () {
    "use strict";

    var dataPromises = []
      , channels = [
        {
            key: "blog1",
            url: 'http://smodcast.com/channels/smodcast/feed/',
            title: 'tbd',
            updated: 'tbd',
            acquireSyndication: acquireSyndication,
            dataPromise: null
        },
        {
            key: "blog2",
            url: 'http://smodcast.com/channels/tell-em-steve-dave/feed/',
            title: 'tbd',
            updated: 'tbd',
            acquireSyndication: acquireSyndication,
            dataPromise: null
        },
        {
            key: "blog3",
            url: 'http://smodcast.com/channels/hollywood-babble-on/feed/',
            title: 'tbd',
            updated: 'tbd',
            acquireSyndication: acquireSyndication,
            dataPromise: null

        },
        {
            key: "blog4",
            url: 'http://smodcast.com/channels/plus-one/feed/',
            title: 'tbd',
            updated: 'tbd',
            acquireSyndication: acquireSyndication,
            dataPromise: null
        },
        {
            key: "blog5",
            url: 'http://smodcast.com/channels/i-sell-comics/feed/',
            title: 'tbd',
            updated: 'tbd',
            acquireSyndication: acquireSyndication,
            dataPromise: null
        }];
    
    // ListView data binding
    var blogPosts = new WinJS.Binding.List();

    /** Process Podcast Channel Feeds */
    function getFeeds() {
        // Get the content for each feed in the channels array
        channels.forEach(function (feed) {
            feed.dataPromise = feed.acquireSyndication(feed.url);
            dataPromises.push(feed.dataPromise);
        });

        // Return when all asynchronous operations are complete
        return WinJS.Promise.join(dataPromises).then(function () {
            return channels;
        });
    }

    /** Get XML for Channel */
    function acquireSyndication(url) {
        // Call xhr for the URL to get results asynchronously
        return WinJS.xhr({
                url: url,
                responseType: "document"
                //headers: { "If-Modified-Since": "Mon, 27 Mar 1972 00:00:00 GMT" }
            });
    }

    /** Get Channel's Episodes */
    function getBlogPosts() {
        // Walk the results to retrieve the podcast episodes
        getFeeds().then(function () {
            // Process each Channel
            channels.forEach(function (feed) {
                feed.dataPromise.then(function (response) {
                    var document = response.responseXML;
                    
                    if (document) {
                        // Get Channel Attributes
                        feed.title = document.querySelector("channel > title").textContent;
                        feed.subtitle = document.querySelector("channel > description").textContent;
                        feed.backgroundImage = document.querySelector("channel > image > url").textContent;
                        
                        // Get Channel's episodes
                        getItemsFromXml(document, blogPosts, feed);
                    }
                    else {
                        console.log("Error loading Podcast Channel.");
                        /**
                        // There was an error loading the blog. 
                        feed.title = "Error loading blog";
                        feed.updated = "Error";
                        blogPosts.push({
                            group: feed,
                            key: "Error loading blog",
                            title: feed.url,
                            author: "Unknown",
                            month: "?",
                            day: "?",
                            year: "?",
                            content: "Unable to load the blog at " + feed.url
                        });
                        */
                    }
                });
            });
        });

        return blogPosts;
    }

    /** Get episode items from XML */
    function getItemsFromXml(document, bPosts, feed) {
        var episodes = document.querySelectorAll("item");

        // Process each episode item
        for (var i = 0; i < episodes.length; i++) {
            var episode = episodes[i];

            var episodeTitle = episode.querySelector("title").textContent;
            var episodePubDate = episode.querySelector("pubDate").textContent;
            var episodeDescription = episode.querySelector("description").textContent;
            // var staticContent = toStaticHTML(post.querySelector("content").textContent);

            // Push episode info to array
            bPosts.push({
                group: feed,
                key: feed.title,
                title: episodeTitle,
                pubDate: episodePubDate,
                description: episodeDescription
            });
        }
    }
    
    // ListView WinJS Control
    var list = getBlogPosts();
    
    // Create grouped listview items
    // ReSharper disable UnusedLocals
    var groupedItems = list.createGrouped(
        function groupKeySelector(item) { return item.group.key; },
        function groupDataSelector(item) { return item.group; }
    );
    // ReSharper restore UnusedLocals

    WinJS.Namespace.define("Data", {
        items: groupedItems,
        groups: groupedItems.groups,
        getItemReference: getItemReference,
        getItemsFromGroup: getItemsFromGroup,
        resolveGroupReference: resolveGroupReference,
        resolveItemReference: resolveItemReference
    });

    // Get a reference for an item, using the group key and item title as a
    // unique reference to the item that can be easily serialized.
    function getItemReference(item) {
        return [item.group.key, item.title];
    }

    // This function returns a WinJS.Binding.List containing only the items
    // that belong to the provided group.
    function getItemsFromGroup(group) {
        return list.createFiltered(function (item) { return item.group.key === group.key; });
    }

    // Get the unique group corresponding to the provided group key.
    function resolveGroupReference(key) {
        for (var i = 0; i < groupedItems.groups.length; i++) {
            if (groupedItems.groups.getAt(i).key === key) {
                return groupedItems.groups.getAt(i);
            }
        }
        return null;
    }

    // Get a unique item from the provided string array, which should contain a
    // group key and an item title.
    function resolveItemReference(reference) {
        for (var i = 0; i < groupedItems.length; i++) {
            var item = groupedItems.getAt(i);
            if (item.group.key === reference[0] && item.title === reference[1]) {
                return item;
            }
        }
        return null;
    }
})();
