// UBit Tests
// Type: compilation
//  showAndPlayText(message: string): void
//  showAndPlayNumber(message: number): void
//  playText(message: string): void
//  connectWifi(wifi: string, password: string): void
//  temperature(): number
//  lightLevel(): number
//  soundLevel(): number
//  direction(): number
//  setupExternalSensors(channel: number): void
//  onGestureReceived(gesture: Gesture, handler: () => void): void
//  shareSensorsWithUBit(channel: number): void

// Display and audio
fwdUbit.showAndPlayText("hello")
fwdUbit.showAndPlayNumber(42)
fwdUbit.playText("world")

// WiFi
fwdUbit.connectWifi("my-network", "my-password")

// Remote sensor connection
fwdUbit.setupExternalSensors(1)
fwdUbit.shareSensorsWithUBit(1)

// Remote sensor readings
const remoteTemp: number = fwdUbit.temperature()
const remoteLight: number = fwdUbit.lightLevel()
const remoteSound: number = fwdUbit.soundLevel()
const remoteHeading: number = fwdUbit.direction()

// Gesture handler
fwdUbit.onGestureReceived(Gesture.Shake, function () {
    fwdUbit.playText("shaken")
})
