## Overview

> **This is an experimental fork of ScratchJr.** Its goal is to make the app
> run on modern Android devices and development environments. It is not
> affiliated with the official ScratchJr project. For the original, see
> [LLK/scratchjr](https://github.com/LLK/scratchjr).
>
> Key changes from upstream:
> - Updated build toolchain: Gradle 8.7, Android Gradle Plugin 8.5, compile/target SDK 35
> - Firebase Analytics is optional (disabled by default — no `google-services.json` required to build)
> - Build scripts updated for Node.js 20 and Python 3
> - Android manifest updated for modern Android (API 33+ permission scoping, required `exported` attributes)

This is the official git repository hosting the source code for the
[ScratchJr](http://scratchjr.org/) project.

ScratchJr can be built both for iOS and Android.
A pure-web version is planned to follow at some point in the future.

Platform | Status
-------- | -------------
iOS      | Released in App Store
Android  | Released in Google Play

## Architecture Overview
The diagram below illustrates the architecture of ScratchJr and
how the iOS (functional), Android (functional) and pure HTML5 (future)
versions share a common client.

![Scratch Jr. Architecture Diagram](doc/scratchjr_architecture.png)


## Directory Structure and Projects
This repository has the following directory structure:

* <tt>src/</tt> - Shared JavaScript code for iOS and Android common client. This is where most changes should be made for features, bug fixes, UI, etc.
* <tt>editions/</tt> - Assembly directories for each "flavor" of ScratchJr. These symlink to src for common code, and could diverge in settings and assets.
  * <tt>free/</tt> - Free edition JavaScript, including all shared code for all releases
* <tt>android/</tt> - Android port of Scratch Jr. (Java, Android Studio Projects)
  * <tt>ScratchJr/</tt> - Android Studio Project for ScratchJr Android Application
* <tt>bin/</tt> - Build scripts and other executables
* <tt>doc/</tt> - Developer Documentation
* <tt>ios/</tt> - Xcode project for iOS build. (Make sure to open <tt>ScratchJr.xcworkspace</tt> not <tt>ScratchJr.xcodeproj</tt>)

## Building ScratchJr

### Initial setup

Regardless of whether you are doing iOS development or Android development, you should do these steps.

1. Clone or update the code for this repo
2. Ensure you have Node.js 18+ and npm [installed](https://www.npmjs.com/get-npm)
3. In the top level of the scratchjr repo directory, install npm dependencies: <tt>npm install</tt>

**macOS (Homebrew):**
```
brew install librsvg imagemagick
pip3 install pysvg-py3
```

**Ubuntu/Debian:**
```
sudo apt-get install librsvg2-bin imagemagick
pip3 install pysvg-py3
```

`librsvg` and `imagemagick` are used to generate PNG thumbnails from SVG assets during the build.
If `rsvg-convert` is not available, the build script will fall back to ImageMagick automatically.

### Analytics

Firebase Analytics is **disabled by default** in this fork — no configuration files are needed to build.

To enable it, set `firebase.enabled=true` in `android/ScratchJr/gradle.properties`, then:

1. Set up a [Firebase project](https://firebase.google.com/products/analytics) and download the config files
2. Place `google-services.json` in `editions/free/android-resources/`
3. Place `GoogleService-Info.plist` in `editions/free/ios-resources/`

### iOS

1. To build the iOS version, you need a Mac with Xcode
2. Run <tt>brew install cocoapods</tt> to install CocoaPods
3. Run <tt>pod install</tt> to install dependencies
4. Open Xcode and open <tt>ios/ScratchJr.xcworkspace</tt>

### Android

Requirements: Android Studio with Android SDK 35, JDK 21.

1. In the top level of the repo, run <tt>npm install</tt>
2. Open Android Studio and open the project <tt>android/ScratchJr</tt>
3. Sync with Gradle (**File → Sync Project with Gradle Files**)
4. Select the `free` flavor and run the `app` configuration

To build and install from the command line:
```
cd android/ScratchJr
./gradlew installFreeDebug
adb shell am start -n org.scratchjr.androidfree/org.scratchjr.android.ScratchJrActivity
```

## Where and how to make changes

All changes should be made in a fork. Before making a pull request, ensure all changes pass our linter:
* <tt>npm run lint</tt>

For more information, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Code credits
ScratchJr would not be possible without free and open source libraries, including:
* [Snap.svg](https://github.com/adobe-webplatform/Snap.svg/)
* [JSZip](https://github.com/Stuk/jszip)
* [Intl.js](https://github.com/andyearnshaw/Intl.js)
* [Yahoo intl-messageformat](https://github.com/yahoo/intl-messageformat)

## Acknowledgments
ScratchJr is a collaborative effort between:

* [Tufts DevTech Research Group](http://ase.tufts.edu/devtech/)
* [Lifelong Kindergarten group at MIT Media Lab](http://llk.media.mit.edu/)
* [Playful Invention Company](http://www.playfulinvention.com/)
* [Two Sigma Investments](http://twosigma.com)
