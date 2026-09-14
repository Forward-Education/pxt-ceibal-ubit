// Bench program for the Ceibal report of 2026-09 (Josefina): a
// "show ... with audio" block inside a forever loop. With extension 1.3.2 the
// static digit is shown and spoken ONCE per screen change; pressing B moves
// to the next case and the new content is announced once. Any indefinite
// repetition of "2" or "numero 3" while the screen is unchanged is a
// regression. Scrolling text ("numero 1") legitimately repeats: the screen
// changes on every pass (it clears at the end of the scroll).
let icon = 0
ceibalUbit.connectWifi("Ceibal", "Ceibal")
ceibalUbit.enableIconAudio(true)
input.onButtonPressed(Button.B, function () {
    icon = (icon + 1) % 4
})
basic.forever(function () {
    if (icon == 0) {
        ceibalUbit.showAndPlayText("2")          // once, then silent
    } else if (icon == 1) {
        ceibalUbit.showAndPlayNumber(7)          // once, then silent
    } else if (icon == 2) {
        basic.showIcon(IconNames.Sad)            // "triste" once (icon path)
    } else if (icon == 3) {
        ceibalUbit.showAndPlayText("numero 1")   // scrolls; repeats per pass
    }
})
