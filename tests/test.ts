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
ceibalUbit.showAndPlayText("hello")
ceibalUbit.showAndPlayNumber(42)
ceibalUbit.playText("world")

// WiFi
ceibalUbit.connectWifi("my-network", "my-password")

// Remote sensor connection
ceibalUbit.setupExternalSensors(1)
ceibalUbit.shareSensorsWithUBit(1)

// Remote sensor readings
const remoteTemp: number = ceibalUbit.temperature()
const remoteLight: number = ceibalUbit.lightLevel()
const remoteSound: number = ceibalUbit.soundLevel()
const remoteHeading: number = ceibalUbit.direction()

// Gesture handler
ceibalUbit.onGestureReceived(Gesture.Shake, function () {
    ceibalUbit.playText("shaken")
})
