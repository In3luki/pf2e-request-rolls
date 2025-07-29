## 1.0.1

### Bugfixes

-   Fix secret inline link background color in dark mode ([#35](https://github.com/In3luki/pf2e-request-rolls/pull/35))

### Enhancements

-   Add `Spell Attack` check roll ([#35](https://github.com/In3luki/pf2e-request-rolls/pull/35))

## 1.0.0

-   Foundry v13 compatibility ([#31](https://github.com/In3luki/pf2e-request-rolls/pull/31))

## 0.7.1

### Enhancements

-   Add Shift + Left Click to copy indiviual raw inline rolls to the clipboard ([#27](https://github.com/In3luki/pf2e-request-rolls/pull/27))
-   Set Request Roll inline links that open the GM dialog to GM-only visibility ([#27](https://github.com/In3luki/pf2e-request-rolls/pull/27))

### Bugfixes

-    Fix counteract check outcome for equal counteract ranks ([#28](https://github.com/In3luki/pf2e-request-rolls/pull/28))

## 0.7.0

### New Features

-   Add counteract checks ([#25](https://github.com/In3luki/pf2e-request-rolls/pull/25))

## 0.6.2

### Enhancements

-   Clean up some sytlings in dark mode ([#24](https://github.com/In3luki/pf2e-request-rolls/pull/24))
-   Use better labels for the type/statistic select elements

## 0.6.1

### New Features

-   Add `basic` option for saves and a `Flat Check` option in the check types dropdown ([#23](https://github.com/In3luki/pf2e-request-rolls/pull/23))

## 0.6.0

### New Features

-   Add a tooltip showing total statistic modifier and proficiency rank for each roll in the roll request dialog ([#22](https://github.com/In3luki/pf2e-request-rolls/pull/22))
-   Allow actor selection in the roll request window. Defaults to `game.user.character` if no token is selected ([#22](https://github.com/In3luki/pf2e-request-rolls/pull/22))

### Enhancements

-   Improve display of clicked links in the roll request dialog ([#22](https://github.com/In3luki/pf2e-request-rolls/pull/22))
-   Show multiple results per user for rolls from different roll groups ([#22](https://github.com/In3luki/pf2e-request-rolls/pull/22))

## 0.5.3

### Enhancements

-   Add group labels to result dialog ([#21](https://github.com/In3luki/pf2e-request-rolls/pull/21))

## 0.5.2

### Bugfixes

-   Restore action roll DC in generated inline rolls ([#19](https://github.com/In3luki/pf2e-request-rolls/pull/19))

## 0.5.1

### New Features

-   Add CSS override settings ([#18](https://github.com/In3luki/pf2e-request-rolls/pull/18))

## 0.5.0

### New Features

-   Add roll results dialog for socket requests ([#17](https://github.com/In3luki/pf2e-request-rolls/pull/17))

## 0.4.0

### New Features

-   Add setting that controls whether the `GMDialog` is closed after sending a request ([#16](https://github.com/In3luki/pf2e-request-rolls/pull/16))
-   Add inline links that open the dialog with the inlined roll data ([#16](https://github.com/In3luki/pf2e-request-rolls/pull/16))

## 0.3.0

### New Features

-   Add player selection dialog for socket roll requests ([#15](https://github.com/In3luki/pf2e-request-rolls/pull/15))
    -   Shift-clicking the `Request Rolls` button skips the dialog and sends the request to all players

### Enhancements

-   The `GMDialog` now stays open after sending requests ([#15](https://github.com/In3luki/pf2e-request-rolls/pull/15))
-   Improve string replacement in optional labels ([#15](https://github.com/In3luki/pf2e-request-rolls/pull/15))
-   Use the same socket message id when loading from history ([#15](https://github.com/In3luki/pf2e-request-rolls/pull/15))
    -   Sending a request with the same id will refresh the open roll windows of receiving clients

## 0.2.0

### New Features

-   Add socket roll requests that open a roll window for the clients ([#13](https://github.com/In3luki/pf2e-request-rolls/pull/13))

## 0.1.1

### Enhancements

-   Improve action handling and select default variant and statistic where possible ([#10](https://github.com/In3luki/pf2e-request-rolls/pull/10))

## 0.1.0

### New Features

-   Add optional label input for check rolls ([#6](https://github.com/In3luki/pf2e-request-rolls/pull/6))

### Enhancements

-   Continue to improve styles ([#6](https://github.com/In3luki/pf2e-request-rolls/pull/6))

## 0.0.2

### New Features

-   Improve clicking rolls in the preview and add some compatibility for `DorakoUI` ([#2](https://github.com/In3luki/pf2e-request-rolls/pull/2))

## 0.0.1

### New Features

-   Initial release.
