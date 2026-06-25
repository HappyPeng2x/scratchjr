import ScratchJr from '../ScratchJr';
import Palette from './Palette';
import Undo from './Undo';
import OS from '../../tablet/OS';
import ScratchAudio from '../../utils/ScratchAudio';
import {frame, gn, newHTML, isAndroid, setProps} from '../../utils/lib';

let interval = null;
let recordedSound = null;
let isRecording = false;
let isPlaying = false;
let available = true;
let error = false;
let dialogOpen = false;
let timeLimit = null;
let playTimeLimit = null;

let volumeIndex = 0;
let volumes = [];

let recordStartTime = null;
let recordDuration = 0;
let timerInterval = null;

export default class Record {
    static get available () {
        return available;
    }

    static set available (newAvailable) {
        available = newAvailable;
    }

    static get dialogOpen () {
        return dialogOpen;
    }

    // Create the recording window, including buttons and volume indicators
    static init () {
        var modal = newHTML('div', 'record fade', frame);
        modal.setAttribute('id', 'recorddialog');
        var topbar = newHTML('div', 'toolbar', modal);
        var actions = newHTML('div', 'actions', topbar);
        newHTML('div', 'microphone', actions);
        var buttons = newHTML('div', 'recordbuttons', actions);
        var okbut = newHTML('div', 'recorddone', buttons);
        okbut.onclick = Record.saveSoundAndClose;
        var sc = newHTML('div', 'soundbox', modal);
        sc.setAttribute('id', 'soundbox');

        // Status area: pulsing dot + state label + elapsed timer
        var statusArea = newHTML('div', 'recordstatus', sc);
        statusArea.setAttribute('id', 'recordstatus');
        var dot = newHTML('div', 'statusdot', statusArea);
        dot.setAttribute('id', 'statusdot');
        var label = newHTML('div', 'statuslabel', statusArea);
        label.setAttribute('id', 'statuslabel');
        label.textContent = 'Ready to record';
        var timer = newHTML('div', 'statustimer', statusArea);
        timer.setAttribute('id', 'statustimer');
        timer.textContent = '--:--';

        // Thin progress bar showing elapsed time vs 30s limit (hidden until recording)
        var progressWrap = newHTML('div', 'progresswrap', sc);
        progressWrap.setAttribute('id', 'progresswrap');
        var progressBar = newHTML('div', 'progressbar', progressWrap);
        progressBar.setAttribute('id', 'progressbar');

        var sv = newHTML('div', 'soundvolume', sc);
        sv.setAttribute('id', 'soundvolume');
        for (var i = 0; i < 13; i++) {
            var si = newHTML('div', 'indicator', sv);
            var sl = newHTML('div', 'soundlevel', si);
            // Bars grow progressively taller left-to-right (25%–100%)
            sl.style.height = Math.round(25 + (i / 12) * 75) + '%';
        }
        var ctrol = newHTML('div', 'soundcontrols', sc);
        ctrol.setAttribute('id', 'soundcontrols');
        var lib = [['record', Record.record], ['stop', Record.stopSnd], ['play', Record.playSnd]];
        for (var j = 0; j < lib.length; j++) {
            Record.newToggleClicky(ctrol, 'id_', lib[j][0], lib[j][1]);
        }
        // Play is disabled until a recording exists
        gn('id_play').setAttribute('class', 'controlwrap disabled');
    }

    // Dialog box hide/show
    static appear () {
        OS.analyticsEvent('editor', 'record_dialog_open');
        gn('backdrop').setAttribute('class', 'modal-backdrop fade in');
        setProps(gn('backdrop').style, {
            display: 'block'
        });
        gn('recorddialog').setAttribute('class', 'record fade in');
        ScratchJr.stopStrips();
        dialogOpen = true;
        ScratchJr.onBackButtonCallback.push(Record.saveSoundandClose);
        // Reset UI to clean initial state
        Record.setStatus('idle');
        Record.resetVolumeBars();
        gn('id_play').setAttribute('class', 'controlwrap disabled');
    }

    static disappear () {
        OS.analyticsEvent('editor', 'record_dialog_close');
        setTimeout(function () {
            gn('backdrop').setAttribute('class', 'modal-backdrop fade');
            setProps(gn('backdrop').style, {
                display: 'none'
            });
            gn('recorddialog').setAttribute('class', 'record fade');
        }, 333);
        dialogOpen = false;
        ScratchJr.onBackButtonCallback.pop();
    }

    // Register toggle buttons and handlers
    static newToggleClicky (p, prefix, key, fcn) {
        var button = newHTML('div', 'controlwrap', p);
        newHTML('div', key + 'snd off', button);
        button.setAttribute('type', 'toggleclicky');
        button.setAttribute('id', prefix + key);
        if (fcn) {
            button.onclick = function (evt) {
                fcn(evt);
            };
        }
        return button;
    }

    // Toggle button appearance on/off
    static toggleButtonUI (button, newState) {
        var element = 'id_' + button;
        var newStateStr = (newState) ? 'on' : 'off';
        var attrclass = button + 'snd';
        gn(element).childNodes[0].setAttribute('class', attrclass + ' ' + newStateStr);
    }

    // Volume UI updater
    static updateVolume (f) {
        var num = Math.round(f * 13);
        var div = gn('soundvolume');
        if (!isRecording && !isPlaying) {
            num = 0;
        }
        for (var i = 0; i < 13; i++) {
            div.childNodes[i].childNodes[0].setAttribute('class', ((i > num) ? 'soundlevel off' : 'soundlevel on'));
        }
    }

    // Stop recording UI and turn off volume levels
    static recordUIoff () {
        Record.toggleButtonUI('record', false);
        var div = gn('soundvolume');
        for (var i = 0; i < gn('soundvolume').childElementCount; i++) {
            div.childNodes[i].childNodes[0].setAttribute('class', 'soundlevel off');
        }
    }

    // Reset all volume bars to off/gray
    static resetVolumeBars () {
        var div = gn('soundvolume');
        for (var i = 0; i < 13; i++) {
            div.childNodes[i].childNodes[0].setAttribute('class', 'soundlevel off');
        }
    }

    // Show a static representation of the recorded volume envelope
    static showEnvelope () {
        if (!volumes.length) {
            return;
        }
        var div = gn('soundvolume');
        for (var i = 0; i < 13; i++) {
            var segStart = Math.floor((i / 13) * volumes.length);
            var segEnd = Math.max(segStart + 1, Math.floor(((i + 1) / 13) * volumes.length));
            var max = 0;
            for (var k = segStart; k < segEnd; k++) {
                if (volumes[k] > max) {
                    max = volumes[k];
                }
            }
            var active = Math.round(max * 13) > i;
            div.childNodes[i].childNodes[0].setAttribute('class', active ? 'soundlevel envelope' : 'soundlevel off');
        }
    }

    // Format milliseconds to M:SS
    static formatTime (ms) {
        var secs = Math.floor(ms / 1000);
        var m = Math.floor(secs / 60);
        var s = secs % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    // Update the status area and progress bar based on current state
    static setStatus (state) {
        var dot = gn('statusdot');
        var label = gn('statuslabel');
        var timer = gn('statustimer');
        var wrap = gn('progresswrap');
        if (state === 'recording') {
            dot.setAttribute('class', 'statusdot recording');
            label.setAttribute('class', 'statuslabel recording');
            label.textContent = 'REC';
            timer.setAttribute('class', 'statustimer recording');
            wrap.setAttribute('class', 'progresswrap visible');
        } else if (state === 'playing') {
            dot.setAttribute('class', 'statusdot playing');
            label.setAttribute('class', 'statuslabel playing');
            label.textContent = 'Playing';
            timer.setAttribute('class', 'statustimer playing');
            wrap.setAttribute('class', 'progresswrap');
        } else {
            dot.setAttribute('class', 'statusdot');
            label.setAttribute('class', 'statuslabel');
            label.textContent = recordedSound ? 'Ready' : 'Ready to record';
            timer.setAttribute('class', 'statustimer');
            timer.textContent = recordDuration > 0 ? Record.formatTime(recordDuration) : '--:--';
            wrap.setAttribute('class', 'progresswrap');
        }
    }

    // Called every 100ms to refresh the timer display and progress bar
    static updateTimerDisplay () {
        if (isRecording && recordStartTime) {
            var elapsed = Date.now() - recordStartTime;
            gn('statustimer').textContent = Record.formatTime(elapsed);
            var pct = Math.min(elapsed / 30000 * 100, 100);
            gn('progressbar').style.width = pct + '%';
            if (elapsed > 25000) {
                gn('progresswrap').setAttribute('class', 'progresswrap visible warning');
            }
        } else if (isPlaying) {
            var playElapsed = volumeIndex * 33;
            gn('statustimer').textContent = Record.formatTime(playElapsed) + ' / ' + Record.formatTime(recordDuration);
        }
    }

    static stopTimerInterval () {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    // On press record button
    static record (e) {
        if (error) {
            Record.killRecorder(e);
            return;
        }
        if (isPlaying) {
            Record.stopPlayingSound(doRecord);
        } else {
            doRecord();
        }
        function doRecord () {
            if (isRecording) {
                Record.stopRecording(); // Stop if we're already recording
            } else {
                OS.sndrecord(Record.startRecording); // Start a recording
            }
        }
    }

    static startRecording (filename) {
        OS.analyticsEvent('editor', 'start_recording');
        volumes = [];
        if (parseInt(filename) < 0) {
            // Error in getting record filename - go back to editor
            recordedSound = undefined;
            isRecording = false;
            Record.killRecorder();
            Palette.selectCategory(3);
        } else {
            // Save recording's filename for later
            recordedSound = filename;
            isRecording = true;
            error = false;
            Record.soundname = filename;
            Record.toggleButtonUI('record', true);
            recordStartTime = Date.now();
            Record.setStatus('recording');
            timerInterval = setInterval(Record.updateTimerDisplay, 100);
            var poll = function () {
                OS.volume(function (f) {
                    volumes.push(f);
                    Record.updateVolume(f);
                });
            };
            interval = setInterval(poll, 33);
            timeLimit = setTimeout(function () {
                if (isRecording) {
                    Record.stopRecording();
                }
            }, 30000);
        }
    }

    // Press the play button
    static playSnd (e) {
        if (error) {
            Record.killRecorder(e);
            return;
        }
        if (!recordedSound) {
            return;
        }
        if (isPlaying) {
            Record.stopPlayingSound();
        } else {
            if (isRecording) {
                Record.stopRecording(Record.startPlaying);
            } else {
                Record.startPlaying();
            }
        }
    }

    // Start playing the sound and switch UI appropriately
    static startPlaying () {
        // Wrap timeOutPlay in a deferred call: OS.startplay invokes the callback
        // synchronously before startPlaying() has set isPlaying/status, so without
        // the defer the immediate-zero-duration timeout would revert status to idle
        // before setStatus('playing') even runs.
        OS.startplay(function (timeout) {
            setTimeout(function () { Record.timeOutPlay(timeout); }, 0);
        });
        Record.toggleButtonUI('play', true);
        isPlaying = true;
        volumeIndex = 0;
        Record.setStatus('playing');
        timerInterval = setInterval(Record.updateTimerDisplay, 100);
        var poll = function () {
            let f = 0;
            if (volumeIndex < volumes.length) {
                f = volumes[volumeIndex];
                volumeIndex++;
            }
            Record.updateVolume(f);
        };
        interval = setInterval(poll, 33);
    }

    // Gets the sound duration from the OS and schedules the end-of-playback cleanup.
    // On Electron the OS returns undefined (async audio), so fall back to recordDuration.
    static timeOutPlay (timeout) {
        var ms = (parseFloat(timeout) > 0) ? Math.round(timeout * 1000) : recordDuration;
        if (ms > 0) {
            recordDuration = ms;
        } else {
            ms = 100; // unknown duration — stop almost immediately
        }
        playTimeLimit = setTimeout(function () {
            Record.stopTimerInterval();
            Record.toggleButtonUI('play', false);
            isPlaying = false;
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
            Record.setStatus('idle');
            Record.showEnvelope();
        }, ms);
    }

    // Press on stop
    static stopSnd (e) {
        if (error) {
            Record.killRecorder(e);
            return;
        }
        if (!recordedSound) {
            return;
        }
        Record.flashStopButton();
        if (isRecording) {
            Record.stopRecording();
        } else if (isPlaying) {
            Record.stopPlayingSound();
        }
    }

    static flashStopButton () {
        Record.toggleButtonUI('stop', true);
        setTimeout(function () {
            Record.toggleButtonUI('stop', false);
        }, 200);
    }

    // Stop playing the sound and switch UI appropriately
    static stopPlayingSound (fcn) {
        OS.stopplay(fcn);
        Record.stopTimerInterval();
        Record.toggleButtonUI('play', false);
        isPlaying = false;
        window.clearTimeout(playTimeLimit);
        playTimeLimit = null;
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
        Record.setStatus('idle');
        Record.showEnvelope();
    }

    // Stop the volume monitor and recording
    static stopRecording (fcn) {
        OS.analyticsEvent('editor', 'stop_recording');
        if (timeLimit != null) {
            clearTimeout(timeLimit);
            timeLimit = null;
        }
        if (interval != null) {
            window.clearInterval(interval);
            interval = null;
            setTimeout(function () {
                Record.volumeCheckStopped(fcn);
            }, 33);
        } else {
            Record.volumeCheckStopped(fcn);
        }
    }

    static volumeCheckStopped (fcn) {
        isRecording = false;
        recordDuration = recordStartTime ? Date.now() - recordStartTime : 0;
        Record.stopTimerInterval();
        Record.recordUIoff();
        gn('id_play').setAttribute('class', 'controlwrap');
        // Set idle state BEFORE OS.recordstop so that if fcn (e.g. startPlaying)
        // is called synchronously it can override these to 'playing' without being
        // immediately overwritten.
        Record.setStatus('idle');
        Record.showEnvelope();
        OS.recordstop(fcn);
    }

    // Press OK (check)
    static saveSoundAndClose () {
        if (error || !recordedSound) {
            Record.killRecorder();
        } else {
            if (isPlaying) {
                Record.stopPlayingSound(Record.closeContinueSave);
            } else {
                if (isRecording) {
                    Record.stopRecording(Record.closeContinueSave);
                } else {
                    Record.closeContinueSave();
                }
            }
        }
    }

    static closeContinueSave () {
        OS.recorddisappear('YES', Record.registerProjectSound);
    }

    static closeContinueRemove () {
        // don't get the sound - proceed right to tearDown
        OS.recorddisappear('NO', Record.tearDownRecorder);
    }

    static registerProjectSound () {
        function whenDone (snd) {
            if (snd != 'error') {
                var spr = ScratchJr.getSprite();
                var page = spr.div.parentNode.owner;
                spr.sounds.push(recordedSound);
                Undo.record({
                    action: 'recordsound',
                    who: spr.id,
                    where: page.id,
                    sound: recordedSound
                });
                ScratchJr.storyStart('Record.registerProjectSound');
            }
            Record.tearDownRecorder();
            Palette.selectCategory(3);
        }
        if (!isAndroid) {
            ScratchAudio.loadFromLocal('Documents', recordedSound, whenDone);
        } else {
            // On Android, just pass URL
            ScratchAudio.loadFromLocal('', recordedSound, whenDone);
        }
    }

    // Called on error - remove everything and hide the recorder
    static killRecorder () {
        // Inform iOS and then tear-down
        if (isPlaying) {
            Record.stopPlayingSound(Record.closeContinueRemove); // stop playing and tear-down
        } else {
            if (isRecording) {
                Record.stopRecording(Record.closeContinueRemove); // stop recording and tear-down
            } else {
                Record.closeContinueRemove();
            }
        }
    }

    static tearDownRecorder () {
        // Clear errors
        if (error) {
            error = false;
        }
        // Refresh audio context
        isRecording = false;
        recordedSound = null;
        recordDuration = 0;
        recordStartTime = null;
        volumes = [];
        Record.stopTimerInterval();
        // Hide the dialog
        Record.disappear();
    }

    // Called when the app is put into the background
    static recordError () {
        error = true;
        Record.killRecorder();
    }
}
