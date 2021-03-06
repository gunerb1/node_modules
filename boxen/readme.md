# boxen [![Build Status](https://travis-ci.org/sindresorhus/boxen.svg?branch=master)](https://travis-ci.org/sindresorhus/boxen)

> Create boxes in the terminal

![](screenshot.png)


## Install

```
$ npm install boxen
```

<a href="https://www.patreon.com/sindresorhus">
	<img src="https://c5.patreon.com/external/logo/become_a_patron_button@2x.png" width="160">
</a>


## Usage

```js
const boxen = require('boxen');

console.log(boxen('unicorn', {padding: 1}));
/*
┌─────────────┐
│             │
│   unicorn   │
│             │
└─────────────┘
*/

console.log(boxen('unicorn', {padding: 1, margin: 1, borderStyle: 'double'}));
/*

   ╔═════════════╗
   ║             ║
   ║   unicorn   ║
   ║             ║
   ╚═════════════╝

*/
```


## API

### boxen(text, [options])

#### text

Type: `string`

Text inside the box.

#### options

Type: `Object`

##### borderColor

Type: `string`<br>
Values: `black` `red` `green` `yellow` `blue` `magenta` `cyan` `white` `gray` or a hex value like `#ff0000`

Color of the box border.

##### borderStyle

Type: `string | object`<br>
Default: `single`<br>
Values:
- `single`
```
┌───┐
│foo│
└───┘
```
- `double`
```
╔═══╗
║foo║
╚═══╝
```
- `round` (`single` sides with round corners)
```
╭───╮
│foo│
╰───╯
```
- `bold`
```
┏━━━┓
┃foo┃
┗━━━┛
```
- `single-double` (`single` on top and bottom, `double` on right and left)
```
╓───╖
║foo║
╙───╜
```
- `double-single` (`double` on top and bottom, `single` on right and left)
```
╒═══╕
│foo│
╘═══╛
```
- `classic`
```
+---+
|foo|
+---+
```

Style of the box border.

Can be any of the above predefined styles or an object with the following keys:

```js
{
	topLeft: '+',
	topRight: '+',
	bottomLeft: '+',
	bottomRight: '+',
	horizontal: '-',
	vertical: '|'
}
```

##### dimBorder

Type: `boolean`<br>
Default: `false`

Reduce opacity of the border.

##### padding

Type: `number | object`<br>
Default: `0`

Space between the text and box border.

Accepts a number or an object with any of the `top`, `right`, `bottom`, `left` properties. When a number is specified, the left/right padding is 3 times the top/bottom to make it look nice.

##### margin

Type: `number | object`<br>
Default: `0`

Space around the box.

Accepts a number or an object with any of the `top`, `right`, `bottom`, `left` properties. When a number is specified, the left/right margin is 3 times the top/bottom to make it look nice.

##### float

Type: `string`<br>
Values: `right` `center` `left`<br>
Default: `left`

Float the box on the available terminal screen space.

##### backgroundColor

Type: `string`
Values: `black` `red` `green` `yellow` `blue` `magenta` `cyan` `white` `gray` or a hex value like `#ff0000`

Color of the background.

##### align

Type: `string`<br>
Default: `left`<br>
Values: `left` `center` `right`

Align the text in the box based on the widest line.


## Related

- [boxen-cli](https://github.com/sindresorhus/boxen-cli) - CLI for this module
- [cli-boxes](https://github.com/sindresorhus/cli-boxes) - Boxes for use in the terminal
- [ink-box](https://github.com/sindresorhus/ink-box) - Box component for Ink that uses this package


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
