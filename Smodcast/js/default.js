/**
 * Kevin Coughlin <kevintcoughlin@gmail.com>
 */
(function ($, _) {
    'use strict';

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var episodesList;
    var episodesListView;
    var currentItemIndex = 0;
    var supportedAudioFormats = [".3g2", ".3gp2", ".3gp", ".3gpp", ".m4a", ".mp4", ".asf", ".wma", ".aac", ".adt", ".adts", ".mp3", ".wav", ".ac3", ".ec3",];
    var systemMediaControls;
    var systemMediaTransportControlsDisplayUpdater = Windows.Media.SystemMediaTransportControls.displayUpdater;
    var notifications = Windows.UI.Notifications;
    var lastViewState;
    var updateEpisodeIntervalId;

    // Selectors
    var $player;
    var $mediaControls;

    // TODO: fix with bind
    var seekToTime = -1;
    var nowPlayingEpisode;

    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // Newly launched
                lastViewState = Windows.UI.ViewManagement.ApplicationView.value;

                WinJS.Application.onsettings = function (e) {
                    e.detail.applicationcommands = { "help": { title: "Privacy Statement", href: "privacy-statement.html" } };
                    WinJS.UI.SettingsFlyout.populateSettings(e);
                };
            } else {
                // Application already activated
            }

            args.setPromise(WinJS.UI.processAll()
                .then(function completed() {
                    _cacheSelectors();
                    _setCoverPhoto();

                    DataService.getEpisodes().done(function (episodes) {
                        var episodeListItemTemplate = $('#iconTextApplicationsTemplate')[0];
                        episodesList = new WinJS.Binding.List(episodes);
                        episodesListView = $('#iconTextApplications')[0].winControl;
                        episodesListView.itemTemplate = episodeListItemTemplate;
                        episodesListView.itemDataSource = episodesList.dataSource;

                        _updateListLayout();
                        $(window).resize(handleResize);

                        systemMediaControls.isEnabled = true;
                        episodesListView.oniteminvoked = function (e) {
                            e.detail.itemPromise.then(function (item) {
                                $mediaControls.show();
                                currentItemIndex = item.index;
                                setNewMediaItem(item.index);
                            });
                        };

                        /*
                        database.clear().then(function (info) {
                            console.log(info);
                        }).catch(function (err) {
                            console.log('error deleting db');
                        });
                        */

                        // DB stuff
                        database.all().then(function (docs) {
                            if (docs.rows.length > 0) {
                                docs.rows.forEach(function (doc) {
                                    var tmpEpisode = episodesList.getItemFromKey(doc.key);
                                    // TODO: handle this better
                                    tmpEpisode.data._id = doc.doc._id;
                                    tmpEpisode.data._rev = doc.doc._rev;
                                    tmpEpisode.data.currentTime = doc.doc.currentTime;
                                    tmpEpisode.data.duration = doc.doc.duration;
                                    episodesList.setAt(tmpEpisode.data.number, tmpEpisode); // TODO: fix index retrieval
                                });
                                WinJS.UI.process(episodesListView);
                            }
                        }).catch(function (err) {
                            console.log('database.all() error');
                        });
                    });

                    setupSystemMediaTransportControls();

                    $player
                        .on('ended', mediaEnded)
                        .on('playing', mediaPlaying)
                        .on('pause', mediaPaused)
                        .on('error', mediaError);
                })
            );
        }
    };

    app.oncheckpoint = function (args) {
        // Application suspended
    };

    app.start();

    function _cacheSelectors() {
        $player = $.media('#player');
        $mediaControls = $('#mediaControls');
    }

    // Fired on resize events
    function handleResize(event) {
        _updateListLayout();
    }

    // Update List layout if necessary
    function _updateListLayout() {
        var viewState = Windows.UI.ViewManagement.ApplicationView;

        // Use ListLayout if in portrait
        if (viewState.getForCurrentView().orientation) {
            if (episodesListView.layout.orientation === "horizontal") {
                episodesListView.layout = new WinJS.UI.ListLayout();
            }
        }
        // Use GridLayout if landscape
        else {
            if (episodesListView.layout.orientation === "vertical") {
                episodesListView.layout = new WinJS.UI.GridLayout();
            }
        }
    }

    // Plays the audio.
    function playMedia(e) {
        $player.play();
    }

    // Pauses the audio.
    function pauseMedia(e) {
        $player.pause();
    }

    // Stops the audio.
    function stopMedia(e) {
        $player.pause();
        $player.seek(0);
    }

    // Event handlers for <audio>
    function mediaPaused(e) {
        $player.autoplay(false);
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.paused;
        pauseMedia();
        stopUpdatingEpisode();
    }

    // Media is currently playing
    function mediaPlaying(e) {
        $player.autoplay(true);
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.playing;
        playMedia();
        if (!updateEpisodeIntervalId) {
            updateEpisodeIntervalId = setUpdateInterval();
        }
    }

    // Media has ended
    function mediaEnded(e) {
        $player.autoplay(false);
        stopMedia();
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.stopped;
        episodesListView.selection.set(null);
        stopUpdatingEpisode();
    }

    // Error with media playback
    function mediaError(e) {
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.closed;
    }

    // Set interval function to update currently playing episode metadata
    function setUpdateInterval() {
        var updateInterval = 5000;

        function updateEpisode() {
            nowPlayingEpisode.data.currentTime = $player.time();

            // TODO: move out of here?
            if (!nowPlayingEpisode.data.duration) {
                nowPlayingEpisode.data.duration = $player.duration();
            }

            // If first time inserting, set _id
            if (!nowPlayingEpisode.data._id) nowPlayingEpisode.data._id = nowPlayingEpisode.key;

            database.insert(nowPlayingEpisode.data).then(function (resp) {
                nowPlayingEpisode.data._id = resp.id;
                nowPlayingEpisode.data._rev = resp.rev;
            }).catch(function (err) {
                console.error(err);
            });
        }

        return setInterval(updateEpisode, updateInterval);
    }

    // Stop interval function that updates currently playing episode metadata
    function stopUpdatingEpisode() {
        clearInterval(updateEpisodeIntervalId);
        updateEpisodeIntervalId = null;
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
        nowPlayingEpisode = newEpisode; //TODO: fix

        // mp3 url is empty i.e. SModcast #139
        if (!newEpisode.data.mediaUrl) {
            var msg = new Windows.UI.Popups.MessageDialog("Unfortunately, this episode can not be streamed.");
            msg.commands.append(new Windows.UI.Popups.UICommand("Close", function () {
                console.log("Can't stream dialog closed.");
            }));
            msg.defaultCommandIndex = 0;
            msg.cancelCommandIndex = 0;
            msg.showAsync();
        } else {
            episodesListView.selection.set(i);
            $player.source(newEpisode.data.mediaUrl);
            $player.play();

            if (newEpisode.data.currentTime) {
                seekToTime = newEpisode.data.currentTime;
            } else {
                seekToTime = -1;
            }

            $player.ready(function () {
                if (seekToTime > -1) $player.time(seekToTime);
            });

            updateSystemMediaDisplay(newEpisode);
        }
    }

    /**
     * Set & Update SystemMediaControls Display
     */
    function updateSystemMediaDisplay(episode) {
        var updater = systemMediaControls.displayUpdater;
        updater.type = Windows.Media.MediaPlaybackType.music;
        try {
            if (updater !== undefined) {
                updater.musicProperties.artist = "Kevin Smith & Scott Mosier";
                updater.musicProperties.albumArtist = "SModcast";
                updater.musicProperties.title = episode.data.title;
                updater.thumbnail = Windows.Storage.Streams.RandomAccessStreamReference.createFromUri(new Windows.Foundation.Uri('http://smodcast.com/wp-content/blogs.dir/1/files_mf/smodcast1400.jpg'));
                updater.update();
            }
        }
        catch(e) {
            console.log(e);
        }
    };

    /**
     * System Media Control Button Event Handler
     * 
     * @param {Object} eventIn Event object
     */
    function systemMediaControlsButtonPressed(eventIn) {
        var mediaButton = Windows.Media.SystemMediaTransportControlsButton;
        switch (eventIn.button) {
            case mediaButton.play:
                $player.play();
                break;
            case mediaButton.pause:
                $player.pause();
                break;
            case mediaButton.stop:
                $player.pause();
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

    /**
     * Blur & set cover photo image
     * TODO: Might be able to do SVG overlay to overcome IE limitation
     * http://blogs.msdn.com/b/ie/archive/2011/10/14/svg-filter-effects-in-ie10.aspx
     */
    function _setCoverPhoto() {
        var coverPhoto = new Image();
        coverPhoto.onload = function () {
            var container = document.getElementById('cover-photo');
            var options = {
                amount: 2.5
            };
            Pixastic.process(coverPhoto, "blurfast", options);
            container.style.background = "url(" + options.resultCanvas.toDataURL("image/png") + ") no-repeat";
            container.style.backgroundSize = "cover";
        };
        coverPhoto.src = 'http://i1.sndcdn.com/artworks-000048733684-usfcdr-original.jpg?435a760';
        coverPhoto.alt = 'SModcast Blurred Cover Photo';
    };

    WinJS.Namespace.define("Smodr", {
        episodesList: episodesList,
        mediaPaused: mediaPaused,
        mediaPlaying: mediaPlaying,
        mediaEnded: mediaEnded,
        mediaError: mediaError
    });

})(jQuery, _);
