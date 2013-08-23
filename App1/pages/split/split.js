(function () {
    "use strict";
    
    var binding = WinJS.Binding;
    var nav = WinJS.Navigation;
    var utils = WinJS.Utilities;

    WinJS.UI.Pages.define("/pages/split/split.html", {

        _group: null,
        /// <field type="WinJS.Binding.List" />
        _items: null,
        _itemSelectionIndex: -1,
        _wasSingleColumn: false,

        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            var listView = element.querySelector(".itemlist").winControl;

            // Update Layout based on View State
            this.updateLayout(element, Windows.UI.ViewManagement.ApplicationView.value, null);

            // Store information about the group and selection that this page will display.
            this._group = Data.resolveGroupReference(options.groupKey);
            this._items = Data.getItemsFromGroup(this._group);
            this._itemSelectionIndex = (options && "selectedIndex" in options) ? options.selectedIndex : -1;

            element.querySelector("header[role=banner] .pagetitle").textContent = this._group.title;

            // Set up the ListView.
            listView.itemDataSource = this._items.dataSource;
            listView.itemTemplate = element.querySelector(".itemtemplate");
            listView.onselectionchanged = this._selectionChanged.bind(this);
            listView.addEventListener("iteminvoked", episodeInvoked);

            function episodeInvoked(eventObject) {
                eventObject.detail.itemPromise.done(function (invokedItem) {
                    MediaPlayer.playlist.push(invokedItem.data.url);
                    MediaPlayer.currentItemIndex = 0;
                    MediaPlayer.updatePlayer();
                    MediaPlayer.updateNowPlaying(invokedItem.data.title);
                });
            }

            this._updateVisibility();
            if (this._isSingleColumn()) {
                this._wasSingleColumn = true;
                if (this._itemSelectionIndex >= 0) {
                    // For single-column detail view, load the article.
                    binding.processAll(element.querySelector(".articlesection"), this._items.getAt(this._itemSelectionIndex));
                }
            } else {
                // If this page has a selectionIndex, make that selection
                // appear in the ListView.
                listView.selection.set(Math.max(this._itemSelectionIndex, 0));
            }
        },

        unload: function () {
            this._items.dispose();
        },

        updateLayout: function (element, viewState, lastViewState) {
            // Respond to changes in viewState.

            // Get the ListView control. 
            var viewStateExampleListView = element.querySelector(".itemlist").winControl;

            // Use a ListLayout if the app is snapped or in full-screen portrait mode. 
            if (viewState === Windows.UI.ViewManagement.ApplicationViewState.snapped ||
                viewState === Windows.UI.ViewManagement.ApplicationViewState.fullScreenPortrait) {

                // If layout.Horizontal is false, the ListView
                // is already using a ListLayout, so we don't
                // have to do anything. We only need to switch
                // layouts when layout.horizontal is true. 
                if (viewStateExampleListView.layout.horizontal) {
                    viewStateExampleListView.layout = new WinJS.UI.ListLayout();
                }
            }

                // Use a GridLayout if the app isn't snapped or in full-screen portrait mode. 
            else {
                // Only switch layouts if layout.horizontal is false. 
                if (!viewStateExampleListView.layout.horizontal) {
                    viewStateExampleListView.layout = new WinJS.UI.GridLayout();
                }
            }

        },

        // This function checks if the list and details columns should be displayed
        // on separate pages instead of side-by-side.
        _isSingleColumn: function () {
            return document.documentElement.offsetWidth <= 767;
        },

        _selectionChanged: function (args) {
            var listView = args.currentTarget.winControl; 
            var details;
            // By default, the selection is restricted to a single item.
            listView.selection.getItems().done(function updateDetails(items) {
                if (items.length > 0) {
                    this._itemSelectionIndex = items[0].index;
                    if (this._isSingleColumn()) {
                        // If snapped or portrait, navigate to a new page containing the
                        // selected item's details.
                        nav.navigate("/pages/split/split.html", { groupKey: this._group.key, selectedIndex: this._itemSelectionIndex });
                    } else {

                    }
                }
            }.bind(this));
        },

        // This function toggles visibility of the two columns based on the current
        // view state and item selection.
        _updateVisibility: function () {
            var splitPage = document.querySelector(".splitpage");
            if (this._isSingleColumn()) {
                if (this._itemSelectionIndex >= 0) {
                    utils.addClass(splitPage, "itemdetail");
                    document.querySelector(".articlesection").focus();
                } else {
                    utils.addClass(splitPage, "groupdetail");
                    document.querySelector(".itemlist").focus();
                }
            } else {
                utils.removeClass(splitPage, "groupdetail");
                utils.removeClass(splitPage, "itemdetail");
                document.querySelector(".itemlist").focus();
            }
        }
    });
})();
