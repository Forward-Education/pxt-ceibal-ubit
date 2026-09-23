// Bench program for the Ceibal report of 2026-09-22 (Josefina), extension
// 1.4.0 + firmware with the '=' tracked-frame marker and the speech cache.
// Cases advance with button B, or over USB serial (115200):
//   "n"            next case            "0".."3"  jump to a case
//   "w SSID PASS"  connect to WiFi      "w SSID"  open network (no password)
//   "s TEXT"       speak TEXT (play-text block, no display)
// Expected:
//  0  "numero 1" scrolls: spoken once per scroll pass, starting as the scroll
//     starts (first pass may lag ~2 s while the clip is fetched; later passes
//     come from the cache). Never twice in one pass, never silent.
//  1  "2" static: spoken once. Turn screen audio OFF then ON on the UBit:
//     "2" is spoken again (re-announce of a tracked frame). Doing the same
//     while case 0 is scrolling speaks the text again.
//  2  show icon Sad, then "numero 3" with audio: "triste" is heard first,
//     then "numero tres". The icon must not be skipped.
//  3  blank screen: turning screen audio off/on announces nothing.
let icon = 3
let parts: string[] = []
serial.setBaudRate(BaudRate.BaudRate115200)
serial.setRxBufferSize(128)   // default 20 bytes truncates "s <long text>" commands
ceibalUbit.enableIconAudio(true)
serial.writeLine("bench-jose ready, case " + icon)
function setCase(c: number) {
    icon = c
    basic.clearScreen()
    serial.writeLine("case " + icon)
}
input.onButtonPressed(Button.B, function () {
    setCase((icon + 1) % 4)
})
serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let cmd = serial.readUntil(serial.delimiters(Delimiters.NewLine)).trim()
    if (cmd == "n") {
        setCase((icon + 1) % 4)
    } else if (cmd.length == 1 && "0123".indexOf(cmd) >= 0) {
        setCase(parseInt(cmd))
    } else if (cmd.substr(0, 2) == "s ") {
        // speak arbitrary text (audio only, no display)
        serial.writeLine("speak: " + cmd.substr(2))
        ceibalUbit.playText(cmd.substr(2))
    } else if (cmd.substr(0, 2) == "w ") {
        parts = cmd.substr(2).split(" ")
        serial.writeLine("wifi " + parts[0] + (parts.length > 1 ? " (password)" : " (open)"))
        ceibalUbit.connectWifi(parts[0], parts.length > 1 ? parts[1] : "")
    } else {
        serial.writeLine("? " + cmd)
    }
})
basic.forever(function () {
    if (icon == 0) {
        serial.writeLine("t=" + control.millis() + " scroll start numero 1")
        ceibalUbit.showAndPlayText("numero 1")
        serial.writeLine("t=" + control.millis() + " scroll end")
    } else if (icon == 1) {
        ceibalUbit.showAndPlayText("2")
        basic.pause(200)
    } else if (icon == 2) {
        serial.writeLine("t=" + control.millis() + " icon sad")
        basic.showIcon(IconNames.Sad)
        serial.writeLine("t=" + control.millis() + " text numero 3")
        ceibalUbit.showAndPlayText("numero 3")
        basic.pause(3000)
    } else {
        basic.pause(500)
    }
})
