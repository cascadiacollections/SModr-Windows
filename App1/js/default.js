// For an introduction to the Split template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkID=232447
(function () {
    "use strict";

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var nav = WinJS.Navigation;

    var smtc;               // System Media Trasport Controls
    var player;             // HTML5 audio element. (video element would also work)
    var playlist = [];      // contains list of media files selected by the user.
    var currentItemIndex;   // keeps track of current item playing.

    app.addEventListener("activated", function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                smtc = Windows.Media.SystemMediaTransportControls.getForCurrentView();
                player = document.getElementById("player");
                player.addEventListener("ended", itemEnded, false);
                player.addEventListener("playing", itemPlaying, false);
                player.addEventListener("pause", itemPaused, false);
                smtc.addEventListener("buttonpressed", smtcButtonPressed, false);
            } else {
                // TODO: This application has been reactivated from suspension.
            }

            if (app.sessionState.history) {
                nav.history = app.sessionState.history;
            }
            args.setPromise(WinJS.UI.processAll().then(function () {
                if (nav.location) {
                    nav.history.current.initialPlaceholder = true;
                    return nav.navigate(nav.location, nav.state);
                } else {
                    return nav.navigate(Application.navigator.home);
                }
            }));
        }
     
    });

    // Linked to player HTML element when Player play button is pressed.
    function itemPlaying() {
        // Let media control know player is playing to keep playback state the same.
        smtc.playbackStatus = Windows.Media.MediaPlaybackStatus.playing;
    }

    // Linked to player HTML element when Player pause button is pressed.
    function itemPaused() {
        // Let media control know player is paused to keep playback state the same.
        smtc.playbackStatus = Windows.Media.MediaPlaybackStatus.paused;
    }

    // Linked to the player HTML element when player ends playback of current item.
    // Automatically moves to next item or cycles to first item in playlist if last item.
    function itemEnded() {
        WinJS.log && WinJS.log("Current item ended, moving to next item", "sample", "status");
        if (currentItemIndex === playlist.length - 1) {
            currentItemIndex = -1;
        }
        nextItem();
    }

    // Method is called when a media key is pressed on a keyboard or
    // System Media Trasport controls UI button is pressed.
    function smtcButtonPressed(ev) {
        var smtcButtons = Windows.Media.SystemMediaTransportControlsButton;
        switch (ev.button) {
            case smtcButtons.play:
                WinJS.log && WinJS.log("Play pressed", "sample", "status");
                startPlayer();
                break;

            case smtcButtons.pause:
                WinJS.log && WinJS.log("Pause pressed", "sample", "status");
                pausePlayer();
                break;

            case smtcButtons.stop:
                WinJS.log && WinJS.log("Stop pressed", "sample", "status");
                stopPlayer();
                break;

            case smtcButtons.next:
                WinJS.log && WinJS.log("Next pressed", "sample", "status");
                nextItem();
                break;

            case smtcButtons.previous:
                WinJS.log && WinJS.log("Previous pressed", "sample", "status");
                previousItem();
                break;
        }
    }

    function startPlayer() {
        if (player.paused) {
            player.play();
        }
    }

    function pausePlayer() {
        if (!player.paused) {
            player.pause();
        }
    }

    function stopPlayer() {
        if (!player.paused) {
            player.pause();
        }
        player.currentTime = 0;
        smtc.playbackStatus = Windows.Media.MediaPlaybackStatus.stopped;
    }

    function nextItem() {
        currentItemIndex++;
        updateItemInfo();
    }

    function previousItem() {
        currentItemIndex--;
        updateItemInfo();
    }

    // Update Media Player
    function updatePlayer() {
        player.setAttribute("src", playlist[0], true);

        // Enables corresponding buttons in System Media Transport Controls UI and
        // corresponding media keys on keyboard
        smtc.isPlayEnabled = true;
        smtc.isPauseEnabled = true;
        smtc.isStopEnabled = true;

        // Logic to enable and disable the previous and next buttons 
        // depending on current item in playlist.
        if (currentItemIndex === 0) {
            smtc.isPreviousEnabled = false;
        }
        else {
            smtc.isPreviousEnabled = true;
        }

        if (currentItemIndex === playlist.length - 1) {
            smtc.isNextEnabled = false;
        }
        else {
            smtc.isNextEnabled = true;
        }

        startPlayer();
        // media player will stop playing when the source is updated.
        // If System Media Trasport Controls was reporting playing, restart the player.
        if (smtc.playbackStatus === Windows.Media.MediaPlaybackStatus.playing) {
            startPlayer();
        }
    }

    app.oncheckpoint = function (args) {
        app.sessionState.history = nav.history;
    };

    // Global Namespace
    WinJS.Namespace.define("MediaPlayer", {
        playlist: playlist,
        currentItemIndex: currentItemIndex,
        updatePlayer: updatePlayer,
        player: player
    });

    app.start();
})();
