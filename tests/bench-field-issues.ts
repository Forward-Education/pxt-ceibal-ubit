// Bench program for the seven Ceibal field reports (2026-08).
// Flash this to the micro:bit paired with a UBit running the queue-rework
// firmware. Expected behavior is noted per step; any looping audio, silent
// string, or double announcement is a regression.

ceibalUbit.enableIconAudio(true)

// Issue 6: a string request BEFORE WiFi is up must not block the later
// connect. Expect: "no hay conexión a wifi" for this text (after retries),
// then a normal "conectando... / wifi conectado" sequence.
ceibalUbit.playText("prueba inicial")
ceibalUbit.connectWifi("Ceibal", "Ceibal")

// Issue 1: the heart is announced exactly once, never loops.
basic.showIcon(IconNames.Heart)
basic.pause(5000)

// Issue 3: small heart says "corazón" once (used to loop as unknown icon).
basic.showIcon(IconNames.SmallHeart)
basic.pause(5000)

// Issue 3: angry is announced once (used to loop).
basic.showIcon(IconNames.Angry)
basic.pause(5000)

// Issue 4: TTS while an icon sits on the display - the string must play.
ceibalUbit.playText("hola mundo")
basic.pause(8000)

// Issue 7: the digit is spoken exactly ONCE (via TTS), not twice.
ceibalUbit.showAndPlayNumber(2)
basic.pause(8000)

// Issue 5: after a clear, re-showing the same icon announces it again.
basic.clearScreen()
basic.pause(1500)
basic.showIcon(IconNames.Heart)

// Issue 2 probe: press B repeatedly - must not crash the micro:bit.
input.onButtonPressed(Button.B, function () {
    ceibalUbit.playText("boton be")
})
