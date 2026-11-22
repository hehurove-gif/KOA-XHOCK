// Casos de prueba compartidos entre las pruebas del servidor (validate-fields.test.js) y del navegador (browser-validation.mjs).
export const long = (n, ch = 'a') => ch.repeat(n);

// ------------------------------------------------------------------ nombre y apellido
export const NAMES_OK = [
  ['Ana', 'Ana'], ['José', 'José'], ['María José', 'María José'], ["O'Connor", "O'Connor"], ['D’Angelo', 'D’Angelo'],
  ['Jean-Luc', 'Jean-Luc'], ['Zoë', 'Zoë'], ['Müller', 'Müller'], ['Łukasz', 'Łukasz'], ['Nguyễn', 'Nguyễn'],
  ['李雷', '李雷'], ['Ольга', 'Ольга'], ['محمد', 'محمد'], ['St. John', 'St. John'], ['Li', 'Li'],
  ['  Ana  ', 'Ana'], ['Ana    María', 'Ana María'], ['José', 'José'], ['A\u0000na', 'Ana'], [long(60), long(60)],
  ['राहुल', 'राहुल'], ['ภัทร', 'ภัทร']
];
export const NAMES_BAD = [
  '', ' ', '   ', 'A', long(61), '1Ana', 'Ana1', 'Ana_', 'Ana@', 'Ana<b>', '<script>alert(1)</script>', '-Ana', "'Ana", '.Ana',
  'Ana\nMaría', 'Ana\tMaría', 'Ana\r\nBcc: x@evil.com', 'Ana😀', '１２', 'Ana;DROP', "Ana' OR '1'='1", '＜Ana', 'Ana‮', 'A‍na',
  'A​na', 'Z̷̢̛͎̈́a̶l̵g̷o̴', 'Ana{{7*7}}', 'Ana${x}', 'Ana/Luis', 'Ana\\Luis', 'Ana, Luis', 'Ana (Lu)', 'Ana=1', 'Ana%20', '𝕬na1'
];

export const EMAILS_OK = [
  ['a@b.co', 'a@b.co'], ['user.name+tag@example.com', 'user.name+tag@example.com'], ["o'brien@example.org", "o'brien@example.org"],
  ['USER@EXAMPLE.COM', 'user@example.com'], ['a_b-c@sub.domain.example.com', 'a_b-c@sub.domain.example.com'],
  ['ñandú@example.mx', 'ñandú@example.mx'], ['  a@b.co  ', 'a@b.co'], ['x@例え.jp', 'x@例え.jp'], [`${long(64)}@example.com`, `${long(64)}@example.com`],
  ['a%b@example.com', 'a%b@example.com'], ['1@2.co', '1@2.co'], ['a@b-c.co', 'a@b-c.co']
];
export const EMAILS_BAD = [
  '', ' ', 'plain', 'a@b', 'a@b.c', '@b.com', 'a@', 'a@@b.com', 'a b@c.com', 'a@b .com', 'a@b..com', 'a@.com', 'a@-b.com', 'a@b-.com',
  'a(b)@c.com', 'a<b>@c.com', 'a"b"@c.com', 'a,b@c.com', 'a;b@c.com', 'a\\b@c.com', 'a:b@c.com', 'a@b.com\nBcc: x@y.com', 'a@b.c0m',
  'a@b.com.', 'a@1.2.3.4', 'a@[127.0.0.1]', 'a@b.com😀', `${long(65)}@example.com`, `a@${long(250)}.com`, '.a@b.com', 'a.@b.com', 'a..b@c.com',
  "a'; DROP TABLE orders;--@b.com", 'a@b.com<script>', 'a@b.com\u0000x', 'a b@c.com', 'a@b_c.com', '"a"@b.com', 'a@b.com,c@d.com', 'a@b.com c@d.com'
];

export const PHONES_OK = [
  '+52 55 1234 5678', '+525512345678', '5512345678', '(555) 123-4567', '+1 (212) 555-0100', '+44 20 7946 0958', '555-1234',
  '+123456789012345', '+52-55-1234-5678', '  5512345678  ', '555.123.4567', '0 800 123 4567'
];
export const PHONES_BAD = [
  '', ' ', 'abc', '123456', '+1234567890123456', '555-CALL-NOW', '+52 55 1234 5678 ext 12', '++5255123456', '5512345678;rm -rf', '55 1234 <5678>',
  'a5512345678', '+', '１２３４５６７８９０', '()()()()()()()', '-------', '+52 55 1234 5678 ', ...[], '5512345678\n', '55123456\u00007', '+52 (55) 1234-5678 x', '555 123 4567 or 555 765 4321',
  '5'.repeat(26), '5512345678,5512345679', "5512345678'; DROP TABLE orders;--"
].filter(v => v !== '+52 55 1234 5678 ' && v !== '5512345678\n' && v !== '55123456\u00007'); // los tres últimos se recortan/limpian y son válidos

export const AGES_OK = [['5', 5], ['99', 99], ['10', 10], ['050', 50], [' 30 ', 30], ['05', 5]];
export const AGES_BAD = ['4', '100', '0', '-5', 'abc', '5.5', '', ' ', '1e1', '５', '3 0', '+30', '30a', '0x1F', '1000', '99.0', '٣٠', 'NaN', '30;DROP', '30\n'].filter(v => v !== '30\n');

export const POS_OK = ['Goalie', 'Left Wing', 'Right Wing', 'Left Defense', 'Right Defense', 'Center', ' Center '].map(p => [p]);
export const POS_BAD = ['', 'goalie', 'GOALIE', 'Left wing', 'Forward', 'Defense', '<b>Center</b>', 'Goalie;DROP', "Center' OR '1'='1", 'Cen​ter', 'Centre', 'Goalie\nCenter'];

export const SIZE_OK = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'm', 'xl', ' M '].map(p => [p]);
export const SIZE_BAD = ['', 'XXXL', 'XXS', 'S/M', 'Large', '42', 'M;DROP', '<M>', 'M​', 'ＸＬ', 'M L'];
