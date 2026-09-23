// Bench program for the Ceibal report of 2026-09-22 (Jose), extension 1.4.0
// + firmware with the '=' tracked-frame marker and the speech cache.
// Press B to step through the cases. Expected:
//  0  "numero 1" scrolls: spoken once per scroll pass, starting as the scroll
//     starts (first pass may lag ~2 s while the clip is fetched; later passes
//     come from the cache). Never twice in one pass, never silent.
//  1  "2" static: spoken once. Press the UBit mode button to turn screen
//     audio OFF then ON: "2" is spoken again (re-announce of a tracked frame).
//     Do the same while case 0 is scrolling: the text is spoken again.
//  2  show icon Sad, then "numero 3" with audio: "triste" is heard first,
//     then "numero tres". The icon must not be skipped.
//  3  blank screen: turning screen audio off/on announces nothing.
let icon = 0
ceibalUbit.connectWifi("Ceibal", "")   // open network: empty password
ceibalUbit.enableIconAudio(true)
input.onButtonPressed(Button.B, function () {
    icon = (icon + 1) % 4
    basic.clearScreen()
})
basic.forever(function () {
    if (icon == 0) {
        ceibalUbit.showAndPlayText("numero 1")
    } else if (icon == 1) {
        ceibalUbit.showAndPlayText("2")
    } else if (icon == 2) {
        basic.showIcon(IconNames.Sad)
        ceibalUbit.showAndPlayText("numero 3")
        basic.pause(3000)
    } else {
        basic.pause(500)
    }
})
