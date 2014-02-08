(function () {
    'use strict';

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

    // List of Smodcast Episodes
    var episodesList;
    var episodesListView;
    var currentlyPlaying = {};
    var currentItemIndex = 0;

    // System Media Controls
    var supportedAudioFormats = [".3g2", ".3gp2", ".3gp", ".3gpp", ".m4a", ".mp4", ".asf", ".wma", ".aac", ".adt", ".adts", ".mp3", ".wav", ".ac3", ".ec3",];
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
                        episodesList = new WinJS.Binding.List(episodes);
                        episodesListView = document.getElementById('iconTextApplications').winControl;
                        var episodeListItemTemplate = document.getElementById('iconTextApplicationsTemplate');
                        episodesListView.itemTemplate = episodeListItemTemplate;
                        episodesListView.itemDataSource = episodesList.dataSource;
                        episodesListView.oniteminvoked = function (e) {
                            e.detail.itemPromise.then(function (item) {
                                // mp3 url is empty i.e. #139
                                if (!item.data.mediaUrl) {
                                    // Create the message dialog and set its content
                                    var msg = new Windows.UI.Popups.MessageDialog("Unfortunately, this episode can not be streamed.");
                                    msg.commands.append(new Windows.UI.Popups.UICommand("Close", closeCommandHandler));
                                    msg.defaultCommandIndex = 0;
                                    msg.cancelCommandIndex = 0;
                                    msg.showAsync();

                                    function closeCommandHandler() {

                                    }

                                    return;
                                }
                                systemMediaControls.isEnabled = true;
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
            )}
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
        // End of playlist reached.  Stopping media playback
        player.autoplay = false;
        stopMedia();
        episodesListView.selection.set(null);
        /* 
        TODO: Implement play next functionality
        var media = document.getElementById("mediaAudio");
        if (playingIndex === DataService.feed.episodes[playingIndex].length - 1) {
            playingIndex = 0;
        } else {
            playingIndex++;
        }
        */
    }

    function mediaError(e) {
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.closed;
    }

    // Invoked from this Page's "ready" method.  Retrieve and initialize the  
    // SystemMediaTransportControls object. 
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

    function setNewMediaItem(i) {
        currentItemIndex = i;
        var newEpisode = episodesList.dataSource.list.getItem(i);
        var episodesListView = document.getElementById('iconTextApplications').winControl;
        episodesListView.selection.set(i);
        player.src = newEpisode.data.mediaUrl;
        player.play();
    }

    /**
     * Handles System Media Control Button Events
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
                stopPlayer();
                break;

            case mediaButton.next:
                setNewMediaItem(currentItemIndex + 1);
                break;

            case mediaButton.previous:
                setNewMediaItem(currentItemIndex - 1);
                break;
        }
    }

    // 'Smodr' Public API
    WinJS.Namespace.define("Smodr", {
        episodesList: episodesList,
        currentlyPlaying: currentlyPlaying,
        mediaPaused: mediaPaused,
        mediaPlaying: mediaPlaying,
        mediaEnded: mediaEnded,
        mediaError: mediaError
    });

})();
