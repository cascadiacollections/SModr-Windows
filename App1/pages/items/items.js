(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/items/items.html", {
        // Page Ready
        ready: function (element, options) {
            var listView = element.querySelector(".itemslist").winControl;
            listView.itemDataSource = Data.groups.dataSource;
            listView.itemTemplate = element.querySelector(".itemtemplate");
            listView.oniteminvoked = this._itemInvoked.bind(this);

            listView.element.focus();
        },

        // Layout Changed
        updateLayout: function (element) {

        },
        // Navigate to item's selected split page
        _itemInvoked: function (args) {
            var groupKey = Data.groups.getAt(args.detail.itemIndex).key;
            WinJS.Navigation.navigate("/pages/split/split.html", { groupKey: groupKey });
        }
    });
})();
