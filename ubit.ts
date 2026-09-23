//% block="UBit"
//% color=#226F54
//% icon="\uf29a"
//% weight=100
namespace ceibalUbit {
    let _remoteLight: number = -999 // Variable to store the last received light level
    let _waitingForLight: boolean = false // Flag to indicate if we are currently waiting for a response
    let _responseLight: boolean = false // Flag to indicate if a response came back during the wait

    let _remoteTemperature: number = -999 // Variable to store the last received temperature
    let _waitingForTemperature: boolean = false // Flag to indicate if we are currently waiting for a response
    let _responseTemperature: boolean = false // Flag to indicate if a response came back during the wait

    let _remoteDirection: number = -999 // Variable to store the last received direction
    let _waitingForDirection: boolean = false // Flag to indicate if we are currently waiting for a response
    let _responseDirection: boolean = false // Flag to indicate if a response came back during the wait

    let _remoteSound: number = -999 // Variable to store the last received sound level
    let _waitingForSound: boolean = false // Flag to indicate if we are currently waiting for a response
    let _responseSound: boolean = false // Flag to indicate if a response came back during the wait

    // Stores the last received number
    let lastReceivedNumber = ""

    let BUFF_LEN = 50
    let I2C_TIME_INTERVAL = 500
    let col = 0
    let row = 0
    let str = ""
    let StopI2CScreen = 0

    let newLedMatrix = pins.createBuffer(25)
    let lastLedMatrix = pins.createBuffer(25)
    let lastSentMatrix = pins.createBuffer(25)

    let _iconAudioEnabled = false // Whether icons on the display are announced via audio
    let _iconAudioLoopStarted = false // Guards against starting the send loop twice

    // Last message shown by a show-with-audio block and the display frame it
    // left behind. While that exact frame is still on the screen, repeating
    // the same block (typical "forever" loop) is a no-op: the screen has not
    // changed, so nothing is re-announced (Ceibal "Option 1" semantics).
    let _lastShownText = ""
    let _lastShownFrame: Buffer = null

    function isAllZero(frame: Buffer): boolean {
        for (let i = 0; i < frame.length; i++) {
            if (frame.getNumber(NumberFormat.UInt8LE, i) != 0) return false
        }
        return true
    }

    // True when `message` was the last thing shown with audio and its glyph
    // is still on the display unchanged (a static digit or single letter).
    // Scrolled text clears the screen when it finishes, and any other block
    // that draws on the display changes the frame, so both fall through and
    // are announced again - exactly when the screen changed.
    function stillShowing(message: string): boolean {
        if (_lastShownFrame == null || message != _lastShownText) return false
        let frame = readDisplayFrame()
        return !isAllZero(frame) && frame.equals(_lastShownFrame)
    }

    function showWithAudio(message: string): void {
        if (stillShowing(message)) return
        StopI2CScreen = 1
        flushPendingIcon()
        sendTextBuffer(message)
        basic.showString(message)
        // Always tell the UBit what the block left on the display (the '='
        // tracked frame, or a clear after a scroll) - even when icon audio is
        // off - so it can re-announce the screen when audio is switched on.
        markDisplayAnnounced()
        _lastShownText = message
        _lastShownFrame = readDisplayFrame()
        StopI2CScreen = 0
    }

    // Reports the frame currently on the display if it has not been sent
    // yet. The icon loop needs a frame to sit unchanged for two ticks (1 s)
    // before it reports it, so an icon shown briefly right before a
    // with-audio block ("show icon", then "show string ... with audio") was
    // never sent and never spoken. The block that is about to replace the
    // display knows the frame is final, so it flushes it first; the UBit
    // then plays the icon prompt and speaks the text after it.
    function flushPendingIcon() {
        if (!_iconAudioEnabled) return
        let frame = readDisplayFrame()
        if (isAllZero(frame) || frame.equals(lastSentMatrix)) return
        lastLedMatrix = copyBuffer(frame)
        lastSentMatrix = copyBuffer(frame)
        sendMatrixPacket(frame, "#")
    }

    // Padding function
    function padEnd(message: string, length: number, char: string) {
        while (message.length < length) {
            message = "" + message + char
        }
        return message
    }

    // Transforms string to buffer, pads it, and sends it to the UBit
    function sendWiFiBuffer(message1: string, message2: string) {
        // Construct the formatted message with '?' at positions
        let finalMessage = "?" + message1 + "?" + message2 + "?"

        // Pad the message to BUFF_LEN with spaces
        finalMessage = padEnd(finalMessage, BUFF_LEN, " ")

        // Create the buffer
        let buffer2 = pins.createBuffer(BUFF_LEN)
        for (let i = 0; i < BUFF_LEN; i++) {
            buffer2.setNumber(
                NumberFormat.UInt8LE,
                i,
                finalMessage.charCodeAt(i),
            )
        }

        // Send buffer via I2C
        pins.i2cWriteBuffer(7, buffer2, false)
    }

    // Transforms string to buffer, pads it, and sends it to the UBit
    function sendTextBuffer(message: string) {
        // Ensure the message does not exceed BUFF_LEN - 1 to make space for '%'
        if (message.length > BUFF_LEN - 1) {
            message = message.slice(0, BUFF_LEN - 1)
        }

        // Add '%' at the start and shift the message
        message = "%" + message + "%"

        // Pad the message to BUFF_LEN with spaces
        message = padEnd(message, BUFF_LEN, " ")

        let buffer2 = pins.createBuffer(BUFF_LEN)
        for (let i = 0; i < BUFF_LEN; i++) {
            buffer2.setNumber(NumberFormat.UInt8LE, i, message.charCodeAt(i))
        }

        // Send buffer via I2C
        pins.i2cWriteBuffer(7, buffer2, false)
    }

    function copyBuffer(original: Buffer): Buffer {
        let copy = pins.createBuffer(original.length)
        copy.write(0, original)
        return copy
    }

    // Reads the current 5x5 display state into a 25-byte buffer
    function readDisplayFrame(): Buffer {
        let frame = pins.createBuffer(25)
        for (let i = 0; i <= 24; i++) {
            row = Math.floor(i / 5)
            col = i % 5
            frame.setNumber(
                NumberFormat.UInt8LE,
                i,
                led.point(row, col) ? 1 : 0,
            )
        }
        return frame
    }

    // Sends a 25-byte display frame to the UBit. Marker '#' = normal icon
    // report (announced once per change); '@' = forced re-announcement
    // (played even if it was already announced).
    function sendMatrixPacket(frame: Buffer, marker: string) {
        let buffer2 = pins.createBuffer(BUFF_LEN)

        // Place the marker at the first position
        buffer2.setNumber(NumberFormat.UInt8LE, 0, marker.charCodeAt(0))

        // Copy the 25-byte frame into buffer2, shifting to the right
        for (let i = 0; i < 25; i++) {
            buffer2.setNumber(
                NumberFormat.UInt8LE,
                i + 1,
                frame.getNumber(NumberFormat.UInt8LE, i),
            )
        }

        // Fill the rest with spaces (ASCII 32)
        for (let i = 26; i < BUFF_LEN; i++) {
            buffer2.setNumber(NumberFormat.UInt8LE, i, " ".charCodeAt(0))
        }

        // Send the buffer via I2C
        pins.i2cWriteBuffer(7, buffer2, false)
    }

    // Reports the display to the UBit whenever the visible frame changes.
    // Each stable frame is sent exactly once (the old version re-sent the
    // same icon every 500 ms forever, flooding the UBit and causing looping
    // audio and lost text messages).
    function sendIconBuffer() {
        let LedMatrix = readDisplayFrame()

        if (!LedMatrix.equals(lastLedMatrix)) {
            // The frame just changed; wait one interval for it to stabilize
            // (an animation or scroll produces a different frame each tick).
            lastLedMatrix = copyBuffer(LedMatrix)
            return
        }

        if (LedMatrix.equals(lastSentMatrix)) {
            return // this frame was already reported
        }
        lastSentMatrix = copyBuffer(LedMatrix)

        // All-zero frames are reported too: they tell the UBit the display
        // was cleared, so showing the same icon again is announced again.
        sendMatrixPacket(LedMatrix, "#")
    }

    // Records the current display frame as already reported and resets the
    // UBit's icon state. Used by the show-with-audio blocks: the glyph they
    // leave on screen (e.g. the digit of "show number 2") was already spoken
    // via the TTS path and must not be announced a second time by the icon
    // loop.
    function markDisplayAnnounced() {
        lastLedMatrix = readDisplayFrame()
        lastSentMatrix = copyBuffer(lastLedMatrix)
        if (isAllZero(lastLedMatrix)) {
            // Nothing left on screen (scrolled text has finished): a normal
            // clear report, understood by every firmware version.
            sendMatrixPacket(lastLedMatrix, "#")
        } else {
            // '=' = "this frame is on the display and has already been
            // spoken": the UBit remembers it silently, so switching screen
            // audio on later can re-announce it (Ceibal option 1). The old
            // code sent an all-zero frame here, which made the UBit believe
            // the display was blank - the re-announce then said nothing.
            // Firmware before 2026-09 ignores '=' (no double audio either).
            sendMatrixPacket(lastLedMatrix, "=")
        }
    }

    // Function to handle different messages
    function handleMessage(msg: string): void {
        if (msg == "Tem") {
            radio.sendValue("Tem", input.temperature())
        } else if (msg == "Lig") {
            radio.sendValue("Lig", input.lightLevel())
        } else if (msg == "Sou") {
            radio.sendValue("Sou", input.soundLevel())
        } else if (msg == "Dir") {
            radio.sendValue("Dir", input.compassHeading())
        } else if (msg == "-1") {
            radio.sendString("Hello!")
        }
    }

    /**
     * Plays the provided text via audio on the UBit and displays it on the micro:bit.
     * @param message the text to show and play
     */
    //% block="show string $message with audio"
    //% message.shadow="text"
    //% blockId=ceibal_ubit_show_and_play_text
    export function showAndPlayText(message: string): void {
        showWithAudio(message)
    }

    /**
     * Plays the provided number via audio on the UBit and displays it on the micro:bit.
     * @param message the number to show and play
     */
    //% block="show number $message with audio"
    //% blockId=ceibal_ubit_show_and_play_number
    export function showAndPlayNumber(message: number): void {
        showWithAudio(message.toString())
    }

    /**
     * Plays the provided text via audio on the UBit.
     * @param message the text to play
     */
    //% block="play $message via audio"
    //% message.shadow="text"
    //% blockId=ceibal_ubit_play_text
    export function playText(message: string): void {
        StopI2CScreen = 1
        flushPendingIcon()
        sendTextBuffer(message)
        // This block does not touch the display, so the UBit must keep the
        // *screen* as what gets re-announced on an audio toggle, not this
        // text: re-report the current frame as tracked ('=') or cleared.
        markDisplayAnnounced()
        StopI2CScreen = 0
    }

    // Sends a settings packet: '$' + kind + value (0..100)
    function sendSettingBuffer(kind: string, value: number) {
        // 0..100 are values; 101 (volume only) means "follow the wheel again"
        let v = Math.constrain(Math.round(value), 0, 101)
        let message = "$" + kind + v.toString()
        message = padEnd(message, BUFF_LEN, " ")
        let buffer2 = pins.createBuffer(BUFF_LEN)
        for (let i = 0; i < BUFF_LEN; i++) {
            buffer2.setNumber(NumberFormat.UInt8LE, i, message.charCodeAt(i))
        }
        pins.i2cWriteBuffer(7, buffer2, false)
    }

    /**
     * Sets the UBit volume (0-100). Moving the volume wheel cancels it.
     * @param percent volume from 0 (mute) to 100 (maximum)
     */
    //% block="set UBit volume to $percent \\%"
    //% percent.min=0 percent.max=100 percent.defl=50
    //% blockId=ceibal_ubit_set_volume
    export function setVolume(percent: number): void {
        sendSettingBuffer("V", percent)
    }

    /**
     * Releases a "set volume" override so the volume wheel is in control again.
     */
    //% block="UBit volume follows the wheel"
    //% blockId=ceibal_ubit_volume_follow_wheel
    export function volumeFollowWheel(): void {
        sendSettingBuffer("V", 101)
    }

    /**
     * Sets the maximum volume the UBit will ever play (10-100). Saved on the UBit.
     * @param percent maximum volume
     */
    //% block="set UBit maximum volume to $percent \\%"
    //% percent.min=0 percent.max=100 percent.defl=100
    //% blockId=ceibal_ubit_set_max_volume
    //% advanced=true
    export function setMaxVolume(percent: number): void {
        sendSettingBuffer("M", percent)
    }

    /**
     * Sets the touch-button sensitivity of the UBit (0-100). Saved on the UBit.
     * @param percent sensitivity
     */
    //% block="set UBit touch sensitivity to $percent \\%"
    //% percent.min=0 percent.max=100 percent.defl=50
    //% blockId=ceibal_ubit_set_sensitivity
    //% advanced=true
    export function setSensitivity(percent: number): void {
        sendSettingBuffer("S", percent)
    }

    /**
     * Connects the UBit to the provided WiFi network.
     * @param wifi the name of the WiFi network
     * @param password the password of the WiFi network
     */
    //% block="connect to network $wifi with password $password"
    //% blockId=ceibal_ubit_connect_wifi
    export function connectWifi(wifi: string, password: string): void {
        StopI2CScreen = 1
        sendWiFiBuffer(wifi, password)
        StopI2CScreen = 0
        str = ""
    }

    /**
     * Enables/disables audio output on the UBit for the
     * icons shown on the micro:bit display.
     * @param on whether icons are announced via audio
     */
    //% block="enable icons with audio $on"
    //% on.shadow="toggleOnOff"
    //% blockId=ceibal_ubit_icon_audio
    export function enableIconAudio(on: boolean): void {
        let wasEnabled = _iconAudioEnabled
        _iconAudioEnabled = on
        if (on && !wasEnabled) {
            // Turning icon audio on announces whatever is on the display
            // right now, even if it was announced before (Ceibal option 1).
            // The '@' marker tells the UBit to bypass its once-per-frame
            // dedupe; an all-zero frame is ignored there, so a blank screen
            // announces nothing.
            let frame = readDisplayFrame()
            lastLedMatrix = copyBuffer(frame)
            lastSentMatrix = copyBuffer(frame)
            sendMatrixPacket(frame, "@")
        }
        if (on && !_iconAudioLoopStarted) {
            // Start the periodic send loop once; the flag check inside keeps
            // it inert whenever icon audio is later disabled.
            _iconAudioLoopStarted = true
            loops.everyInterval(I2C_TIME_INTERVAL, function () {
                if (_iconAudioEnabled && StopI2CScreen == 0) {
                    sendIconBuffer()
                }
            })
        }
    }

    /**
     * Get the temperature from a remote micro:bit.
     * Requires that a remote connection has been established with the use sensors and share sensors blocks.
     */
    //% block="temperature (°C) from external micro:bit"
    //% blockId=ceibal_ubit_temperature
    export function temperature(): number {
        _remoteTemperature = -999
        _waitingForTemperature = true
        _responseTemperature = false

        radio.sendString("Tem")

        const startTime = control.millis()
        const timeout = 1000

        while (control.millis() - startTime < timeout) {
            if (_responseTemperature) {
                return _remoteTemperature
            }
            basic.pause(20)
        }

        _waitingForTemperature = false
        return -999
    }

    /**
     * Get the light level from an external micro:bit.
     * Requires that a remote connection has been established with the use sensors and share sensors blocks.
     */
    //% block="light level from external micro:bit"
    //% blockId=ceibal_ubit_light_level
    export function lightLevel(): number {
        _remoteLight = -999
        _waitingForLight = true
        _responseLight = false

        radio.sendString("Lig")

        const startTime = control.millis()
        const timeout = 1000

        while (control.millis() - startTime < timeout) {
            if (_responseLight) {
                return _remoteLight
            }
            basic.pause(20)
        }

        _waitingForLight = false
        return -999
    }

    /**
     * Get the sound level from an external micro:bit.
     * Requires that a remote connection has been established with the use sensors and share sensors blocks.
     */
    //% block="sound level from external micro:bit"
    //% blockId=ceibal_ubit_sound_level
    export function soundLevel(): number {
        _remoteSound = -999
        _waitingForSound = true
        _responseSound = false

        radio.sendString("Sou")

        const startTime = control.millis()
        const timeout = 1000

        while (control.millis() - startTime < timeout) {
            if (_responseSound) {
                return _remoteSound
            }
            basic.pause(20)
        }

        _waitingForSound = false
        return -999
    }

    /**
     * Get the compass heading from an external micro:bit.
     * Requires that a remote connection has been established with the use sensors and share sensors blocks.
     */
    //% block="compass heading from external micro:bit"
    //% blockId=ceibal_ubit_direction
    export function direction(): number {
        _remoteDirection = -999
        _waitingForDirection = true
        _responseDirection = false

        radio.sendString("Dir")

        const startTime = control.millis()
        const timeout = 1000

        while (control.millis() - startTime < timeout) {
            if (_responseDirection) {
                return _remoteDirection
            }
            basic.pause(20)
        }

        _waitingForDirection = false
        return -999
    }

    /**
     * Use sensors from an external micro:bit on the provided radio group.
     * Both micro:bits need to be using the same radio group to communicate.
     * Requires that the external micro:bit completes the remote connection with the share sensors block.
     * @param channel the radio group to communicate on
     */
    //% block="use sensors from external micro:bit on radio group $channel"
    //% channel.min=1 channel.max=255
    //% blockId=ceibal_ubit_setup_external_sensors
    export function setupExternalSensors(channel: number): void {
        radio.setGroup(channel)

        radio.onReceivedValue(function (tag, value) {
            if (_waitingForLight && tag == "Lig") {
                _remoteLight = value
                _responseLight = true
                _waitingForLight = false
            }
            if (_waitingForTemperature && tag == "Tem") {
                _remoteTemperature = value
                _responseTemperature = true
                _waitingForTemperature = false
            }
            if (_waitingForDirection && tag == "Dir") {
                _remoteDirection = value
                _responseDirection = true
                _waitingForDirection = false
            }
            if (_waitingForSound && tag == "Sou") {
                _remoteSound = value
                _responseSound = true
                _waitingForSound = false
            }
        })
    }

    /**
     * Executes an action when the provided gesture occurs on the external micro:bit.
     * Requires that a remote connection has been established with the use sensors and share sensors blocks.
     * @param gesture the gesture that triggers the action
     * @param handler the action that is triggered by the gesture
     */
    //% block="when external micro:bit is $gesture"
    //% gesture.defl=Gesture.Shake
    //% blockId=ceibal_ubit_on_gesture_received
    export function onGestureReceived(
        gesture: Gesture,
        handler: () => void,
    ): void {
        control.onEvent(4001, EventBusValue.MICROBIT_EVT_ANY, function () {
            let receivedGesture = control.eventValue()
            if (receivedGesture === gesture) {
                handler()
            }
        })
    }

    /**
     * Share data from this micro:bit with the UBit micro:bit on the provided radio group.
     * Both micro:bits need to be using the same radio group to communicate.
     * Requires that the UBit micro:bit completes the remote connection with the use sensors block.
     * @param channel the radio group to communicate on
     */
    //% block="share sensors with UBit on radio group $channel"
    //% channel.min=1 channel.max=255
    //% blockId=ceibal_ubit_share_sensors_with_ubit
    export function shareSensorsWithUBit(channel: number): void {
        radio.setGroup(channel)

        radio.onReceivedString(function (msg: string) {
            handleMessage(msg)
        })

        control.onEvent(
            EventBusSource.MICROBIT_ID_GESTURE,
            EventBusValue.MICROBIT_EVT_ANY,
            function () {
                let gesture = control.eventValue()
                radio.raiseEvent(4001, gesture)
            },
        )
    }
}
