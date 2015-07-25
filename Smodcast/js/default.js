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
    var supportedAudioFormats = ['.3g2', '.3gp2', '.3gp', '.3gpp', '.m4a', '.mp4', '.asf', '.wma', '.aac', '.adt', '.adts', '.mp3', '.wav', '.ac3', '.ec3',];
    var systemMediaControls;
    var systemMediaTransportControlsDisplayUpdater = Windows.Media.SystemMediaTransportControls.displayUpdater;
    var notifications = Windows.UI.Notifications;
    var lastViewState;
    var $player;
    var $mediaControls;
    var seekToTime = -1;
    var nowPlayingEpisode;

    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // Newly launched
                lastViewState = Windows.UI.ViewManagement.ApplicationView.value;
                WinJS.Application.onsettings = function (e) {
                    e.detail.applicationcommands = { 'help': { title: 'Privacy Statement', href: 'privacy-statement.html' } };
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

    function handleResize(event) {
        _updateListLayout();
    }

    function _updateListLayout() {
        var viewState = Windows.UI.ViewManagement.ApplicationView;

        if (viewState.getForCurrentView().orientation) {
            if (episodesListView.layout.orientation === 'horizontal') {
                episodesListView.layout = new WinJS.UI.ListLayout();
            }
        } else {
            if (episodesListView.layout.orientation === 'vertical') {
                episodesListView.layout = new WinJS.UI.GridLayout();
            }
        }
    }

    function playMedia(e) {
        $player.play();
    }

    function pauseMedia(e) {
        $player.pause();
    }

    function stopMedia(e) {
        $player.pause();
        $player.seek(0);
    }

    function mediaPaused(e) {
        $player.autoplay(false);
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.paused;
        pauseMedia();
    }

    function mediaPlaying(e) {
        $player.autoplay(true);
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.playing;
        playMedia();
    }

    function mediaEnded(e) {
        $player.autoplay(false);
        stopMedia();
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.stopped;
        episodesListView.selection.set(null);
    }

    function mediaError(e) {
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.closed;
    }

    function setupSystemMediaTransportControls() {
        systemMediaControls = Windows.Media.SystemMediaTransportControls.getForCurrentView();
        systemMediaControls.isEnabled = false;
        systemMediaControls.addEventListener('buttonpressed', systemMediaControlsButtonPressed, false);
        systemMediaControls.isPlayEnabled = true;
        systemMediaControls.isPauseEnabled = true;
        systemMediaControls.isStopEnabled = true;
        systemMediaControls.isNextEnabled = true;
        systemMediaControls.isPreviousEnabled = true;
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.closed;
    }

    function setNewMediaItem(i) {
        var newEpisode = episodesList.dataSource.list.getItem(i);
        nowPlayingEpisode = newEpisode; //TODO: fix

        // mp3 url is empty i.e. SModcast #139
        if (!newEpisode.data.mediaUrl) {
            var msg = new Windows.UI.Popups.MessageDialog('Unfortunately, this episode can not be streamed.');
            msg.commands.append(new Windows.UI.Popups.UICommand('Close', function () {}));
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

    function updateSystemMediaDisplay(episode) {
        var updater = systemMediaControls.displayUpdater;
        updater.type = Windows.Media.MediaPlaybackType.music;
        try {
            if (updater !== undefined) {
                updater.musicProperties.artist = 'Kevin Smith & Scott Mosier';
                updater.musicProperties.albumArtist = 'SModcast';
                updater.musicProperties.title = episode.data.title;
                updater.thumbnail = Windows.Storage.Streams.RandomAccessStreamReference.createFromUri(new Windows.Foundation.Uri('http://smodcast.com/wp-content/blogs.dir/1/files_mf/smodcast1400.jpg'));
                updater.update();
            }
        }
        catch(e) {
            console.log(e);
        }
    };

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

    function _setCoverPhoto() {
        var coverPhoto = new Image();
        coverPhoto.onload = function () {
            var container = document.getElementById('cover-photo');
            var options = {
                amount: 2.5
            };
            Pixastic.process(coverPhoto, 'blurfast', options);
            container.style.background = 'url(' + options.resultCanvas.toDataURL('image/png') + ') no-repeat';
            container.style.backgroundSize = 'cover';
        };
        coverPhoto.src = 'http://i1.sndcdn.com/artworks-000048733684-usfcdr-original.jpg?435a760';
        coverPhoto.alt = 'SModcast Blurred Cover Photo';
    };

    WinJS.Namespace.define('Smodr', {
        episodesList: episodesList,
        mediaPaused: mediaPaused,
        mediaPlaying: mediaPlaying,
        mediaEnded: mediaEnded,
        mediaError: mediaError
    });

})(jQuery, _);
