(function () {"use strict";

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

    // List of Smodcast Episodes
    var episodesList = new WinJS.Binding.List();
    var currentlyPlaying = {};
    var playingIndex = 0;

    // Media Controls
    var systemMediaControls;
    var player;


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

                    player = document.getElementById("player");
                    player.addEventListener("ended", mediaEnded, false);
                    player.addEventListener("playing", mediaPlaying, false);
                    player.addEventListener("pause", mediaPaused, false);
                    player.addEventListener("error", mediaError, false);

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

                            player.src = item.data.mediaUrl;
                            player.play();
                        });

                        systemMediaControls = Windows.Media.SystemMediaTransportControls.getForCurrentView();
                        systemMediaControls.onbuttonpressed = systemMediaControlsButtonPressed;
                        systemMediaControls.IsPlayEnabled = true;
                        systemMediaControls.IsPauseEnabled = true;
                    };

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
        // End of playlist reached.  We'll just stop media playback. 
        player.autoplay = false;
        stopMedia();
        WinJS.log && WinJS.log("end of playlist, stopping playback", "sample", "status");
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

    function mediaError(e) {
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.closed;
    }

    // Invoked from this Page's "ready" method.  Retrieve and initialize the  
    // SystemMediaTransportControls object. 
    function setupSystemMediaTransportControls() {
        // Retrieve the SystemMediaTransportControls object associated with the current app view 
        // (ie. window).  There is exactly one instance of the object per view, instantiated by 
        // the system the first time getForCurrentView() is called for the view.  All subsequent  
        // calls to getForCurrentView() from the same view (eg. from different scenario pages in  
        // this sample) will return the same instance of the object. 
        systemMediaControls = Windows.Media.SystemMediaTransportControls.getForCurrentView();

        // This scenario will always start off with no media loaded, so we will start off disabling the  
        // system media transport controls.  Doing so will hide the system UI for media transport controls 
        // from being displayed, and will prevent the app from receiving any events such as buttonpressed  
        // from it, regardless of the current state of event registrations and button enable/disable states. 
        // This makes isEnabled a handy way to turn system media transport controls off and back on, as you  
        // may want to do when the user navigates to and away from certain parts of your app. 
        systemMediaControls.isEnabled = false;

        // To receive notifications for the user pressing media keys (eg. "Stop") on the keyboard, or  
        // clicking/tapping on the equivalent software buttons in the system media transport controls UI,  
        // all of the following needs to be true: 
        //     1. Register for buttonpressed event on the SystemMediaTransportControls object. 
        //     2. isEnabled property must be true to enable SystemMediaTransportControls itself. 
        //        [Note: isEnabled is initialized to true when the system instantiates the 
        //         SystemMediaTransportControls object for the current app view.] 
        //     3. For each button you want notifications from, set the corresponding property to true to 
        //        enable the button.  For example, set isPlayEnabled to true to enable the "Play" button  
        //        and media key. 
        //        [Note: the individual button-enabled properties are initialized to false when the 
        //         system instantiates the SystemMediaTransportControls object for the current app view.] 
        // 
        // Here we'll perform 1, and 3 for the buttons that will always be enabled for this scenario (Play, 
        // Pause, Stop).  For 2, we purposely set isEnabled to false to be consistent with the scenario's  
        // initial state of no media loaded.  Later in the code where we handle the loading of media 
        // selected by the user, we will enable SystemMediaTransportControls. 
        systemMediaControls.addEventListener("buttonpressed", systemMediaControlsButtonPressed, false);

        // Note: one of the prerequisites for an app to be allowed to play audio while in background,  
        // is to enable handling Play and Pause buttonpressed events from SystemMediaTransportControls. 
        systemMediaControls.isPlayEnabled = true;
        systemMediaControls.isPauseEnabled = true;
        systemMediaControls.isStopEnabled = true;
        systemMediaControls.playbackStatus = Windows.Media.MediaPlaybackStatus.closed;
    }

    // For supported audio and video formats for Windows Store apps, see: 
    //     http://msdn.microsoft.com/en-us/library/windows/apps/hh986969.aspx 
    var supportedAudioFormats = [
        ".3g2", ".3gp2", ".3gp", ".3gpp", ".m4a", ".mp4", ".asf", ".wma", ".aac", ".adt", ".adts", ".mp3", ".wav", ".ac3", ".ec3",
    ];

    // this scenario's event handler for SystemMediaTransportControls' buttonpressed event 
    function systemMediaControlsButtonPressed(eventIn) {
        // Check if the user is still on scenario 1, or has started going into  
        // another scenario in the sample. 
        if (!isScenario1Active) {
            return;
        }

        var mediaButton = Windows.Media.SystemMediaTransportControlsButton;
        switch (eventIn.button) {
            case mediaButton.play:
                WinJS.log && WinJS.log("Play pressed", "sample", "status");
                player.play();
                break;

            case mediaButton.pause:
                WinJS.log && WinJS.log("Pause pressed", "sample", "status");
                player.pause();
                break;

            case mediaButton.stop:
                WinJS.log && WinJS.log("Stop pressed", "sample", "status");
                stopPlayer();
                break;

            case mediaButton.next:
                WinJS.log && WinJS.log("Next pressed", "sample", "status");
                //setNewMediaItem(currentItemIndex + 1);
                break;

            case mediaButton.previous:
                WinJS.log && WinJS.log("Previous pressed", "sample", "status");
                //setNewMediaItem(currentItemIndex - 1);
                break;

                // Insert additional case statements for other buttons you want to handle in your app. 
                // Remember that you also need to first enable those buttons via the corresponding 
                // is****Enabled property on the SystemMediaTransportControls object. 
        }
    }

    // Public Members
    WinJS.Namespace.define("Smodr", {
        episodesList: episodesList,
        currentlyPlaying: currentlyPlaying,
        mediaPaused: mediaPaused,
        mediaPlaying: mediaPlaying,
        mediaEnded: mediaEnded,
        mediaError: mediaError
    });

})();
