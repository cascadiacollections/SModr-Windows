/**
 * Smodcast Network Data Source
 * TODO: Review and implement: http://msdn.microsoft.com/en-us/library/windows/apps/hh974582.aspx
 * TODO: Sample Code: http://code.msdn.microsoft.com/windowsapps/RSS-Reader-in-a-Windows-8-e75c0034
 */
(function () {

    // Definition of the data adapter
    var smodcoDataAdapter = WinJS.Class.define(
        
        // Constructor
        function (endpoint) {
            this._minPageSize   = 0;
            this._maxPageSize   = 1000;
            this._maxCount      = 1000;
            this._endpoint      = endpoint;
        },

        // Data Adapter interface methods
        {
            // Returns items count
            getCount: function () {
                var that = this,
                    requestStr = "http://smodcast.com/channels" + that._endpoint;   // Build feed URL

                // Return XHR promise
                return WinJS.xhr({
                    url: requestStr,
                    responseType: "document"
                }).then(
                    // Success callback
                    function (request) {
                        var doc = request.responseXML;
                        WinJS.log && WinJS.log(doc.toString, "sample", "error");
                    },
                    // Error callback
                    function (request) {
                        if (request.status === 401) {
                            WinJS.log && WinJS.log(request.statusText, "sample", "error");
                        } else {
                            WinJS.log && WinJS.log("Error fetching data from the service. " + request.responseText, "sample", "error");
                        }
                        return 0;
                    });
            },

            // Called by the virtualized datasource to fetch items
            // It will request a specific item and optionally ask for a number of items on either side of the requested item. 
            // The implementation should return the specific item and, in addition, can choose to return a range of items on either 
            // side of the requested index. The number of extra items returned by the implementation can be more or less than the number requested.
            //
            // Must return back an object containing fields:
            //   items: The array of items of the form items=[{ key: key1, data : { field1: value, field2: value, ... }}, { key: key2, data : {...}}, ...];
            //   offset: The offset into the array for the requested item
            //   totalCount: (optional) update the value of the count
            itemsFromIndex: function (requestIndex) {
                var that = this;

                // Build feed URL
                var requestStr = "http://smodcast.com/channels" + that._endpoint;
               
                // Return XHR promise
                return WinJS.xhr({
                    url: requestStr,
                    responseType: "document"
                }).then(
                    // Callback for success
                    function (result) {
                        var doc = result.response;

                        var results = [];
                        
                        // If episodes exist and > 0
                        if (result.response) {
                            var episodes = doc.querySelectorAll("item");
                            for (var i = 0; i < episodes.length; i++) {
                                var dataItem = episodes[i];
                                
                                // Convert the date for display
                                var date = new Date(dataItem.querySelector("pubDate").textContent);
                                var dateFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("month.abbreviated day year.full");
                                var blogDate = dateFmt.format(date);

                                // items = [{ key: key1, data : { field1: value, field2: value, ... }}, { key: key2, data : {...}}, ...];
                                results.push({
                                    key: i,
                                    data: {
                                        title: dataItem.querySelector("title").textContent,
                                        subtitle: blogDate,
                                        description: dataItem.querySelector("description").textContent,
                                        backgroundImage: "http://smodcast.com/wp-content/blogs.dir/1/files_mf/smodcast1400.jpg",
                                        content: dataItem.querySelector("description").textContent
                                    }
                                });
                            }
                            // Return Episodes and the offset into the array for the requested item
                            return {
                                items: results
                            };
                        } else {
                            WinJS.log && WinJS.log(result.statusText, "sample", "error");
                            return WinJS.Promise.wrapError(new WinJS.ErrorFromName(WinJS.UI.FetchError.doesNotExist));
                        }
                    },

                    // Called on an error from the XHR Object
                    function (result) {
                        if (result.status === 401) {
                            WinJS.log && WinJS.log(result.statusText, "sample", "error");
                        } else {
                            WinJS.log && WinJS.log("Error fetching data from the service. " + result.responseText, "sample", "error");
                        }
                        return WinJS.Promise.wrapError(new WinJS.ErrorFromName(WinJS.UI.FetchError.noResponse));
                    });
            }

            // setNotificationHandler: not implemented
            // itemsFromStart: not implemented
            // itemsFromEnd: not implemented
            // itemsFromKey: not implemented
            // itemsFromDescription: not implemented
        });

    WinJS.Namespace.define("smodcoDataSource", {
        datasource: WinJS.Class.derive(WinJS.UI.VirtualizedDataSource, function (endpoint) {
            this._baseDataSourceConstructor(new smodcoDataAdapter(endpoint));
        })
    });
})();
