(function () {"use strict";

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

    // List of Smodcast Episodes
    var episodesList = new WinJS.Binding.List();
    var currentlyPlaying = {};
    var playingIndex = 0;

    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // Newly launched

                // Add privacy policy to settings charm
                WinJS.Application.onsettings = function (e) {
                    e.detail.applicationcommands = { "help": { title: "Privacy Statement", href: "privacy-statement.html" } };
                    WinJS.UI.SettingsFlyout.populateSettings(e);
                };

            } else {
                // Activated

            }
            args.setPromise(WinJS.UI.processAll()
                .then(function completed() {
                    var episodesListView = document.getElementById('iconTextApplications').winControl,
                        episodeListItemTemplate = document.getElementById('iconTextApplicationsTemplate');

                    episodesListView.itemTemplate = episodeListItemTemplate;
                    episodesListView.itemDataSource = episodesList.dataSource;
                    episodesListView.oniteminvoked = function (e) {
                        e.detail.itemPromise.then(function (item) {

                            // mp3 url is empty i.e. #139
                            if (!item.data.mediaUrl) {
                                // Create the message dialog and set its content
                                var msg = new Windows.UI.Popups.MessageDialog("Unfortunately, this episode can not be streamed.");
                                msg.commands.append(new Windows.UI.Popups.UICommand("Close", commandInvokedHandler));
                                msg.defaultCommandIndex = 0;
                                msg.cancelCommandIndex = 0;
                                msg.showAsync();

                                function commandInvokedHandler() {

                                }

                                return;
                            }

                            playingIndex = item.index;
                            currentlyPlaying = item;
                            episodesListView.selection.set(item);

                            /*
                            var nowPlaying = document.getElementById('nowPlaying');
                            nowPlaying.innerHTML = "<strong>Now Playing: </strong>" + item.data.title;
                            */

                            var media = document.getElementById("mediaAudio");
                            media.src = item.data.mediaUrl;
                            media.play();
                        });
                    };

                    // Event handler for SystemMediaTransportControls' buttonpressed event
                    function systemMediaControlsButtonPressed(eventIn) {
                        var mediaButton = Windows.Media.SystemMediaTransportControlsButton;
                        switch (eventIn.button) {
                            case mediaButton.play:
                                playMedia();
                                break;
                            case mediaButton.pause:
                                pauseMedia();
                                break;
                            case mediaButton.stop:
                                stopMedia();
                                break;
                        }
                    }
                })
            )}
    };

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().
    };

    app.start();

    // Plays the audio.
    function playMedia() {
        var media = document.getElementById("mediaAudio");
        media.play();
    }

    // Pauses the audio.
    function pauseMedia() {
        var media = document.getElementById("mediaAudio");
        media.pause();
    }

    // Stops the audio.
    function stopMedia() {
        var media = document.getElementById("mediaAudio");
        media.pause();
        media.currentTime = 0;
    }

    // Event handlers for <audio>
    function mediaPaused(e) {
        pauseMedia();
    }

    function mediaPlaying(e) {
        playMedia();
    }

    function mediaEnded(e) {
        /* 
        TODO: Implement play next functionality
        var media = document.getElementById("mediaAudio");
        if (playingIndex === DataService.feed.episodes[playingIndex].length - 1) {
            playingIndex = 0;
        } else {
            playingIndex++;
        }
        */
        var episodesListView = document.getElementById('iconTextApplications').winControl;
        episodesListView.selection.set(null);
    }

    // Public Members
    WinJS.Namespace.define("Smodr", {
        episodesList: episodesList,
        currentlyPlaying: currentlyPlaying,
        mediaPaused: mediaPaused,
        mediaPlaying: mediaPlaying,
        mediaEnded: mediaEnded
    });

})();
