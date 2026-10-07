// Josefina's test program (share 80457-28906-35413-45242), verbatim, built
// against this extension (1.4.0) instead of the #v1.0.4 her project pinned.
// Button B steps cases 0..4.
input.onButtonPressed(Button.B, function () {
    icon = icon + 1
    if (icon == 5) {
        icon = 0
    }
})
let icon = 0
ceibalUbit.connectWifi("Casa-2.4GHz", "cereales")
ceibalUbit.enableIconAudio(true)
icon = 0
basic.forever(function () {
    if (icon == 0) {
        ceibalUbit.playText("numero cero")
    } else if (icon == 1) {
        ceibalUbit.showAndPlayText("numero 1")
    } else if (icon == 2) {
        ceibalUbit.showAndPlayText("2")
    } else if (icon == 3) {
        basic.showIcon(IconNames.Sad)
        ceibalUbit.showAndPlayText("numero 3")
    } else if (icon == 4) {
        ceibalUbit.showAndPlayText("numero 4")
        basic.showIcon(IconNames.Yes)
    }
})
