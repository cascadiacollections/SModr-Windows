(function () {
    'use strict';

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var episodesList;
    var episodesListView;
    var currentItemIndex = 0;
    //var supportedAudioFormats = [".3g2", ".3gp2", ".3gp", ".3gpp", ".m4a", ".mp4", ".asf", ".wma", ".aac", ".adt", ".adts", ".mp3", ".wav", ".ac3", ".ec3",];
    var systemMediaControls;
    var player;

    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // Application newly launched

                // Add privacy policy to settings charm
                WinJS.Application.onsettings = function (e) {
                    e.detail.applicationcommands = { "help": { title: "Privacy Statement", href: "privacy-statement.html" } };
                    WinJS.UI.SettingsFlyout.populateSettings(e);
                };

            } else {
                // Application already activated

            }
            args.setPromise(WinJS.UI.processAll()
                .then(function completed() {
                    DataService.getEpisodes().done(function (episodes) {
                        var episodeListItemTemplate = document.getElementById('iconTextApplicationsTemplate');
                        episodesList = new WinJS.Binding.List(episodes);
                        episodesListView = document.getElementById('iconTextApplications').winControl;
                        episodesListView.itemTemplate = episodeListItemTemplate;
                        episodesListView.itemDataSource = episodesList.dataSource;

                        player.src = episodesList.getItem(currentItemIndex).data.mediaUrl;
                        episodesListView.selection.set(currentItemIndex);
                        systemMediaControls.isEnabled = true;

                        episodesListView.oniteminvoked = function (e) {
                            e.detail.itemPromise.then(function (item) {
                                currentItemIndex = item.index;
                                setNewMediaItem(item.index);
                            });
                        };
                    });

                    setupSystemMediaTransportControls();

                    player = document.getElementById("player");
                    player.addEventListener("ended", mediaEnded, false);
                    player.addEventListener("playing", mediaPlaying, false);
                    player.addEventListener("pause", mediaPaused, false);
                    player.addEventListener("error", mediaError, false);
                })
            );
        }
    };

    app.oncheckpoint = function (args) {
        // Application suspended
    };

    app.start();

    // Plays the audio.
    function playMedia() {
        player.play();
    }

    // Pauses the audio.
    function pauseMedia() {
        player.pause();
    }

    // Stops the audio.
    function stopMedia() {
        player.pause();
        player.currentTime = 0;
    }

    // Event handlers for <audio>
    function mediaPaused(e) {
        player.autoplay = false;
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.paused;
        pauseMedia();
    }

    function mediaPlaying(e) {
        player.autoplay = true;
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.playing;
        playMedia();
    }

    function mediaEnded(e) {
        player.autoplay = false;
        stopMedia();
        episodesListView.selection.set(null);
    }

    function mediaError(e) {
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.closed;
    }

    /**
     * Retrieve and initialize the SystemMediaTransportControls object. 
     */
    function setupSystemMediaTransportControls() {
        systemMediaControls = Windows.Media.SystemMediaTransportControls.getForCurrentView();
        systemMediaControls.isEnabled = false;
        systemMediaControls.addEventListener("buttonpressed", systemMediaControlsButtonPressed, false);
        systemMediaControls.isPlayEnabled = true;
        systemMediaControls.isPauseEnabled = true;
        systemMediaControls.isStopEnabled = true;
        systemMediaControls.isNextEnabled = true;
        systemMediaControls.isPreviousEnabled = true;
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.closed;
    }

    /**
     * Sets Player's source attribute with new URL
     * 
     * @param {Number} i Index of the episode to set as source
     */
    function setNewMediaItem(i) {
        var newEpisode = episodesList.dataSource.list.getItem(i);

        // mp3 url is empty i.e. #139
        if (!newEpisode.data.mediaUrl) {
            var msg = new Windows.UI.Popups.MessageDialog("Unfortunately, this episode can not be streamed.");
            msg.commands.append(new Windows.UI.Popups.UICommand("Close", function () {

            }));
            msg.defaultCommandIndex = 0;
            msg.cancelCommandIndex = 0;
            msg.showAsync();
        } else {
            episodesListView.selection.set(i);
            player.src = newEpisode.data.mediaUrl;
            player.play();
        }
    }

    /**
     * System Media Control Button Event Handler
     * 
     * @param {Object} eventIn Event object
     */
    function systemMediaControlsButtonPressed(eventIn) {
        var mediaButton = Windows.Media.SystemMediaTransportControlsButton;
        switch (eventIn.button) {
            case mediaButton.play:
                player.play();
                break;

            case mediaButton.pause:
                player.pause();
                break;

            case mediaButton.stop:
                player.pause();
                break;

            case mediaButton.next:
                currentItemIndex -= 1;
                if (currentItemIndex < 0) {
                    currentItemIndex = episodesList.length - 1;
                }
                setNewMediaItem(currentItemIndex);
                break;

            case mediaButton.previous:
                currentItemIndex += 1;
                if (currentItemIndex > episodesList.length - 1) {
                    currentItemIndex = 0;
                }
                setNewMediaItem(currentItemIndex);
                break;
        }
    }

    // 'Smodr' Public API
    WinJS.Namespace.define("Smodr", {
        episodesList: episodesList,
        mediaPaused: mediaPaused,
        mediaPlaying: mediaPlaying,
        mediaEnded: mediaEnded,
        mediaError: mediaError
    });

})();
