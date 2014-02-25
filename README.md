HTTPMS Android Client
============

This is an android client for my [HTTP Media Server](https://github.com/ironsmile/httpms). It is built with phonegap/cordova.


Development Status
============
The app is still in development. With that said I feel it is now in the stage where it can be used without any major problems. It will have lots of missing features though!


Building Requirements
============

* Android SDK

* Cordova/Phonegap 3.3.0 or above

* The following list of cordova/phonegap plugins:

```
$ phonegap plugin list
[phonegap] com.ironsmile.cordova.mediaevents
[phonegap] org.apache.cordova.battery-status
[phonegap] org.apache.cordova.dialogs
[phonegap] org.apache.cordova.media
```

com.ironsmile.cordova.mediaevents can be found [here](https://github.com/ironsmile/com.ironsmile.cordova.mediaevents).


Known Issues
============
* This client will not work with HTTPMS which has HTTP Basic Authenticate on.
