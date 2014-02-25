function httpms_url(url) {
    return $('#httpms_address').val() + url;
}

var player = {

    current: null,
    pause_position: null,
    track: null,
    queue: [],

    set_track: function (track) {
        this.stop();
        this.track = track;
        var self = this;

        // Play the audio file at url
        this.current = new Media(
            httpms_url('/file/'+track.id),
            // success callback
            function () {
                console.log("playAudio():Audio Success");
            },
            // error callback
            function (err) {
                console.log("playAudio():Audio Error.\ncode: " + err.code + 
                    "\nmessage: " + err.message);
            },
            // status callback
            function (status) {
                if (status != Media.MEDIA_STOPPED) {
                    return;
                };
                if (self.pause_position) {
                    return;
                };
                if (self.queue.length) {
                    self.next();
                } else {
                    $(self).trigger('onstop');    
                }
            }
        );
    },

    play: function () {
        if (!this.current && this.track) {
            this.set_track(this.track);
        };
        if (!this.current) {
            return;
        };
        this.current.play();
        if (this.pause_position) {
            console.log("Seeking to " + this.pause_position);
            this.current.seekTo(this.pause_position * 1000);
            this.pause_position = null;
        };
        set_now_playing(this.track);
        $(this).trigger('onplay');
    },

    pause: function () {
        this.short_pause();
    },

    short_pause: function () {
        if (!this.current) {
            return;
        };
        this.current.pause();
        $(this).trigger('onpause');
    },

    long_pause: function () {
        if (!this.current) {
            return;
        }

        var self = this;

        this.current.getCurrentPosition(function (position) {
            // success
            if (position < 0) {
                return;
            };
            console.log("Pause position set to: " + position);
            self.pause_position = position;
        }, function (error) {
            // failure
            console.log("Unable to obtain track position: " + error);
        });

        this.current.stop();
        this.current.release();
        this.current = null;

        $(this).trigger('onpause');
    },

    stop: function () {
        if (!this.current) {
            return;
        }
        this.pause_position = null;
        this.current.stop();
        this.current.release();
        this.current = null;
        $(this).trigger('onstop');
    },

    set_queue: function(songs_list) {
        this.queue = songs_list;
    },

    append_to_queue: function(track) {
        this.queue.push(track);
    },

    next: function() {
        if (!this.queue.length) {
            return;
        };
        var next = this.queue[0];
        this.queue = this.queue.slice(1);
        this.set_track(next);
        this.play();
    }

};

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.appInit();
        app.bindPluginEvents();
    },

    bindPluginEvents: function() {
        window.addEventListener("batterycritical", this.onBatteryCritical, false);
        window.addEventListener("becomingnoisy", this.onBecomingNoisy, false);
        document.addEventListener("searchbutton", show_search_prompt, false);
    },

    onBatteryCritical: function () {
        console.log("battery critical event received");
        player.stop();
    },

    onBecomingNoisy: function () {
        console.log("becoming noisy");
        player.stop();
    },

    // Update DOM on a Received Event
    appInit: function(id) {

        if (window.navigator.mediaevents) {
            console.log("MediaEvents seems to be installed correctly");
        } else {
            console.log("Error: MediaEvents is not installed");
        }

        this.restoreSettings();
        this.bindSettingsEvents();

        var change_with_pause_button = function () {
            var myself = this;
            var btn = $('#control-button');

            btn.removeClass("play").addClass("pause");
            btn.parent().unbind("tap").bind('tap', function(event){
                myself.pause();
            });

        };

        var resume_play_button = function () {
            var myself = this;
            var btn = $('#control-button');

            btn.removeClass("pause").addClass("play");
            btn.parent().unbind("tap").bind('tap', function(event){
                myself.play();
            });
        };

        $(player).bind('onplay', change_with_pause_button);
        $(player).bind('onplay', function() {
            $('.footer-controls').show();
        });
        $(player).bind('onpause', resume_play_button);
        $(player).bind('onstop', resume_play_button);

        $('.clickable').bind('vmousedown', click_highlighter);

        $('#settings-button').click(function(event) {
            $('body').pagecontainer("change", "#settings");
        });

        $('#search-button').click(show_search_prompt);
    },

    bindSettingsEvents: function () {
        $('#httpms_address').change(function(event) {
            window.localStorage.httpms_address = $(event.target).val();
        });

        $('#httpms_user').change(function(event) {
            window.localStorage.httpms_user = $(event.target).val();
        });

        $('#httpms_password').change(function(event) {
            window.localStorage.httpms_password = $(event.target).val();
        });
    },

    restoreSettings: function () {
        if (window.localStorage.httpms_address) {
            $('#httpms_address').val(window.localStorage.httpms_address);
        }

        if (window.localStorage.httpms_user) {
            $('#httpms_user').val(window.localStorage.httpms_user);
        }

        if (window.localStorage.httpms_password) {
            $('#httpms_password').val(window.localStorage.httpms_password);
        }
    }
};

function click_highlighter(event){
    var self = this;
    $(self).addClass("clicked");
    setTimeout(function(){
        $(self).removeClass("clicked");
    }, 250);
}

function show_search_prompt() {
    navigator.notification.prompt(
        'What do you want to listen to?',
        function (result) {
            if (result.buttonIndex != 1) {
                return;
            };
            if (!result.input1.length) {
                return;
            };
            search_httpms(result.input1);
        },
        'Search',
        ['Go', 'Cancel']
    );
}

function httpms_headers() {
    //!TODO: add BASIC authenticate headers if needed
    return {};
}

_search_request = null;

function search_httpms(search_query) {
    console.log("serch initiated");

    if (search_query.length < 2) {
        console.log("Search query too short: " + search_query);
        return;
    };

    var active_page = $('body').pagecontainer("getActivePage");

    console.log("Active page:");
    console.log(active_page);

    if (active_page.attr('id') != "search-page") {
        $('body').pagecontainer("change", "#search-page");
    };

    if (_search_request) {
        _search_request.abort();
        _search_request = null;
    };

    var search_url = httpms_url(encodeURI('/search/'+search_query));
    $('#search_output').html("Searching...");

    _search_request = $.ajax({
        type: "GET",
        url: search_url,
        headers: httpms_headers(),
        success: function (msg) {
            _search_request = null;
            console.log("Search request succeeded.");
            display_search_results(msg);
        },
        error: function (xhr, txt, exception) {
            $('#search_output').html("Failed.");
            console.log("Error with the search request.");
            console.log(txt);
            console.log(exception);
        }
    });
}

function play_album(album, from_track) {
    if (_search_request) {
        _search_request.abort();
        _search_request = null;
    };

    var search_url = httpms_url(encodeURI('/search/'+album));

    _search_request = $.ajax({
        type: "GET",
        url: search_url,
        headers: httpms_headers(),
        success: function (msg) {
            _search_request = null;
            console.log("Album request succeeded.");
            
            msg.sort(function(a, b) {
                if (a.track == b.track) {
                    return 0;
                };
                return (a.track < b.track) ? -1 : 1;
            });

            console.log("Setting queue:");
            console.log(msg);

            player.set_queue(msg);
            player.next();
        },
        error: function (xhr, txt, exception) {
            show_toast("Playing " + album + " failed.");
            console.log("Error with album request.");
            console.log(txt);
            console.log(exception);
        }
    });
}

function display_search_results(msg) {
    var output = $('#search_output');
    output.empty();

    var artists = {};
    var albums = {};

    for (var i = 0, len = msg.length; i < len; i++) {
        var track = msg[i];

        if (!artists[track.artist]) {
            artists[track.artist] = {
                cnt: 0
            };
        }
        artists[track.artist].cnt = artists[track.artist].cnt + 1;

        if (!albums[track.album]) {
            albums[track.album] = {
                cnt: 0,
                artist: track.artist
            };
        }
        albums[track.album].cnt = albums[track.album].cnt + 1;
    }

    artists = sort_object(artists);
    albums = sort_object(albums);

    var track_album_template = $('.track-album-template').children();
    var results = $('.search-output-template').children().clone();

    for (var i = 0, len = Math.min(artists.length, 5); i < len; i++) {
        var artist = artists[i];
        var el = track_album_template.clone();
        el.find('.title').html(artist.name);
        el.click(function () {
            show_toast("not implemented");
        });

        results.find('.artists-results').append(el);
    };

    for (var i = 0, len = Math.min(albums.length, 5); i < len; i++) {
        var album = albums[i];
        var el = track_album_template.clone();
        el.find('.title').html(album.name);
        el.find('.artist').html(album.artist);

        el.click(function (album) {
            return function () {
                play_album(album);    
            }
        }(album.name));

        results.find('.albums-results').append(el);
    };

    for (var i = 0, len = Math.min(msg.length, 15); i < len; i++) {
        var track = msg[i];
        var el = track_album_template.clone();
        el.find('.title').html(track.title);
        el.find('.artist').html(track.artist);
        el.click(play_track_callback(track));

        results.find('.tracks-results').append(el);
    };

    results.find('.clickable').bind('tap', click_highlighter);

    output.append(results);
};

function sort_object(obj) {
    var out = [];
    for (var index in obj) {
        var obj_el = obj[index];
        obj_el.name = index;
        out.push(obj_el)
    }

    out.sort(function (a, b) {
        if (a.cnt == b.cnt) {
            return 0;
        };

        return (a.cnt < b.cnt) ? 1 : -1;
    });

    return out;
}


function play_track_callback(track) {
    return function (event) {
        if (player.track && track.id == player.track.id) {
            return;
        };
        
        $('.playing').removeClass('playing');
        $(event.target).addClass('playing');

        player.set_track(track);
        player.play();
    };
}

function set_now_playing(track) {
    $('.now-playing .track').html(track.title);
    $('.now-playing .artist').html(track.artist);
    $('.now-playing .album').html(' - ' + track.album);
}

function show_toast(message, timeout) {
    timeout = timeout || 500;
    var toast = $('.toast-template').children().clone();
    toast.html(message);
    $('body').append(toast);
    toast.show();
    setTimeout(function () {
        toast.remove();
    }, timeout);
}
