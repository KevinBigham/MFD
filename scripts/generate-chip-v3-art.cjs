const { existsSync } = require('node:fs');
const { access, mkdir, mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');

function requireOptional(moduleName) {
  try {
    return require(moduleName);
  } catch {
    return null;
  }
}

const playwright = requireOptional('playwright');
const sharp = requireOptional('sharp');
const SIPS_BIN = process.platform === 'darwin' ? '/usr/bin/sips' : null;

const ROOT = resolve(__dirname, '..');
const CHIP_DIR = resolve(ROOT, 'apps/web/public/assets/chip');
const INLINE_DIR = resolve(CHIP_DIR, 'inline');
const CONTACT_SHEET = process.env.CHIP_ART_CONTACT_SHEET === 'false'
  ? null
  : process.env.CHIP_ART_CONTACT_SHEET
    ? resolve(process.env.CHIP_ART_CONTACT_SHEET)
    : resolve(CHIP_DIR, 'chip-v3-contact-sheet.png');
const FULL = { width: 600, height: 732, viewBox: '0 0 600 732' };
const INLINE = { width: 600, height: 600, viewBox: '85 22 430 430' };
const FULL_BODY_STAGE_TRANSFORM = 'translate(300 366) scale(1.12) translate(-300 -366)';

const POSES = [
  ['idle', 'chip-coach.png'],
  ['talk', 'chip-broadcast.png'],
  ['celebrate', 'pose-celebrate.png'],
  ['concern', 'pose-concern.png'],
  ['disappointed', 'pose-disappointed.png'],
  ['excited', 'pose-excited.png'],
  ['greeting', 'pose-greeting.png'],
  ['mic-check', 'pose-mic-check.png'],
  ['point-left', 'pose-point-left.png'],
  ['point-right', 'pose-point-right.png'],
  ['sad', 'pose-sad.png'],
  ['surprised', 'pose-surprised.png'],
  ['think', 'pose-think.png'],
  ['thumbs-up', 'pose-thumbs-up.png'],
  ['warning', 'pose-warning.png'],
  ['wave', 'pose-wave.png'],
  ['whispering', 'pose-whispering.png'],
  ['rallying', 'pose-rallying.png'],
  ['coaching-crouch', 'pose-coaching-crouch.png'],
  ['calling-play', 'pose-calling-play.png'],
  ['time-out', 'pose-time-out.png'],
  ['whistle-blow', 'pose-whistle-blow.png'],
  ['coffee-sip', 'pose-coffee-sip.png'],
  ['on-phone', 'pose-on-phone.png'],
  ['reviewing-tablet', 'pose-reviewing-tablet.png'],
  ['head-in-hands', 'pose-head-in-hands.png'],
  ['fist-bump', 'pose-fist-bump.png'],
  ['note-taking', 'pose-note-taking.png'],
  ['laughing', 'pose-laughing.png'],
  ['skeptical', 'pose-skeptical.png'],
  ['proud', 'pose-proud.png'],
  ['facepalm', 'pose-facepalm.png'],
  ['frustrated', 'pose-frustrated.png'],
  ['tired', 'pose-tired.png'],
  ['football-in-hand', 'pose-football-in-hand.png'],
  ['pointing-at-tape', 'pose-pointing-at-tape.png'],
];

const REGENERATE_EXISTING = process.env.CHIP_ART_REGENERATE_EXISTING === 'true';

function canUseSips() {
  return Boolean(SIPS_BIN && existsSync(SIPS_BIN));
}

const colors = {
  ink: '#080b10',
  softInk: '#151c25',
  skin: '#a85f3d',
  skinLight: '#eaa06a',
  skinShade: '#713922',
  hair: '#0d0d0f',
  hairLight: '#f1c95a',
  mustache: '#1b1714',
  polo: '#c42032',
  poloShade: '#76111c',
  poloLight: '#f0c341',
  jeans: '#101e2a',
  jeansLight: '#2cd3e4',
  sneaker: '#d4b15b',
  sneakerBlue: '#111923',
  clipboard: '#d0a642',
  paper: '#f0d48b',
  headset: '#05080d',
  mic: '#05080d',
  tattoo: '#42d9e8',
  cyan: '#42d9e8',
  gold: '#f0c341',
  redHot: '#e63a4f',
  cap: '#05080d',
  capPanel: '#13212d',
  jerseyPanel: '#0e1a25',
  jacketShadow: '#4e0c15',
  white: '#fff4d6',
};

function path(points) {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
}

function stroke(points, color, width, extra = '') {
  return `<path d="${path(points)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
}

function ellipse(cx, cy, rx, ry, fill, extra = '') {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
}

function circle(cx, cy, r, fill, extra = '') {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
}

function hand(x, y, kind = 'fist') {
  const finger = (points, outer = 10, inner = 6) => `${stroke(points, colors.ink, outer)}${stroke(points, colors.skinLight, inner)}`;
  const palm = ellipse(x, y, 20, 16, colors.skinLight, `stroke="${colors.ink}" stroke-width="6"`);
  const knuckles = `<path d="M ${x - 12} ${y - 8} L ${x - 11} ${y + 7} M ${x} ${y - 11} L ${x} ${y + 8} M ${x + 12} ${y - 7} L ${x + 11} ${y + 6}" stroke="${colors.skinShade}" stroke-width="3" stroke-linecap="round" opacity="0.55"/>`;

  if (kind === 'open') {
    return `
      <g>
        ${finger([[x - 12, y - 7], [x - 28, y - 23]])}
        ${finger([[x - 4, y - 11], [x - 9, y - 32]])}
        ${finger([[x + 5, y - 10], [x + 9, y - 31]])}
        ${finger([[x + 12, y - 4], [x + 28, y - 17]], 9, 5)}
        ${palm}
        <path d="M ${x - 9} ${y + 5} Q ${x + 1} ${y + 14} ${x + 12} ${y + 6}" fill="none" stroke="${colors.skinShade}" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
      </g>
    `;
  }

  if (kind === 'point') {
    return `
      <g>
        ${finger([[x + 4, y - 9], [x + 35, y - 25]], 12, 7)}
        ${palm}
        <path d="M ${x - 13} ${y - 2} L ${x + 12} ${y - 5} M ${x - 8} ${y + 8} L ${x + 10} ${y + 6}" stroke="${colors.skinShade}" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
      </g>
    `;
  }

  if (kind === 'thumb') {
    return `
      <g>
        ${finger([[x + 5, y - 4], [x + 14, y - 34]], 13, 8)}
        ${palm}
        ${knuckles}
      </g>
    `;
  }

  return `
    <g>
      ${palm}
      ${knuckles}
    </g>
  `;
}

function clipboard(x = 165, y = 332, rotate = -9) {
  return `
    <g transform="rotate(${rotate} ${x} ${y})">
      <rect x="${x - 56}" y="${y - 80}" width="112" height="158" rx="10" fill="${colors.clipboard}" stroke="${colors.ink}" stroke-width="9"/>
      <path d="M ${x - 45} ${y - 66} L ${x + 45} ${y - 66} L ${x + 39} ${y + 63} L ${x - 41} ${y + 67} Z" fill="${colors.paper}" stroke="${colors.ink}" stroke-width="5"/>
      <path d="M ${x - 34} ${y - 42} L ${x + 32} ${y - 47}" stroke="${colors.cyan}" stroke-width="5" stroke-linecap="round"/>
      <path d="M ${x - 30} ${y - 15} C ${x - 6} ${y - 36}, ${x + 16} ${y + 1}, ${x + 34} ${y - 21}" fill="none" stroke="${colors.ink}" stroke-width="5" stroke-linecap="round"/>
      <path d="M ${x - 34} ${y + 11} L ${x + 30} ${y + 7} M ${x - 25} ${y + 33} L ${x + 21} ${y + 30}" stroke="${colors.ink}" stroke-width="5" stroke-linecap="round"/>
      <g fill="none" stroke="${colors.ink}" stroke-width="5" stroke-linecap="round">
        <path d="M ${x - 31} ${y - 31} L ${x - 15} ${y - 17} M ${x - 15} ${y - 31} L ${x - 31} ${y - 17}"/>
        <path d="M ${x + 8} ${y - 38} L ${x + 25} ${y - 24} M ${x + 25} ${y - 38} L ${x + 8} ${y - 24}"/>
        <circle cx="${x - 24}" cy="${y + 51}" r="6"/>
        <circle cx="${x}" cy="${y + 51}" r="6"/>
        <circle cx="${x + 24}" cy="${y + 51}" r="6"/>
      </g>
      <path d="M ${x - 26} ${y - 90} L ${x + 26} ${y - 90} Q ${x + 21} ${y - 115} ${x} ${y - 100} Q ${x - 21} ${y - 115} ${x - 26} ${y - 90} Z" fill="${colors.softInk}" stroke="${colors.ink}" stroke-width="6"/>
      <path d="M ${x - 16} ${y - 91} L ${x + 16} ${y - 91}" stroke="${colors.gold}" stroke-width="5" stroke-linecap="round"/>
    </g>
  `;
}

function tablet(x = 300, y = 338, rotate = 0, scale = 1) {
  return `
    <g transform="rotate(${rotate} ${x} ${y}) scale(${scale}) translate(${x * (1 / scale - 1)} ${y * (1 / scale - 1)})">
      <rect x="${x - 70}" y="${y - 52}" width="140" height="104" rx="12" fill="${colors.softInk}" stroke="${colors.ink}" stroke-width="8"/>
      <rect x="${x - 56}" y="${y - 38}" width="112" height="76" rx="5" fill="#102434" stroke="${colors.cyan}" stroke-width="4"/>
      <path d="M ${x - 42} ${y - 18} L ${x - 10} ${y - 18} M ${x - 42} ${y + 2} L ${x + 36} ${y + 2} M ${x - 42} ${y + 22} L ${x + 18} ${y + 22}" stroke="${colors.gold}" stroke-width="5" stroke-linecap="round"/>
      <path d="M ${x + 18} ${y - 26} l 24 18 l -34 23" fill="none" stroke="${colors.cyan}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      ${circle(x, y + 45, 5, colors.cyan)}
    </g>
  `;
}

function mug(x, y, rotate = 0) {
  return `
    <g transform="rotate(${rotate} ${x} ${y})">
      <rect x="${x - 25}" y="${y - 30}" width="52" height="55" rx="8" fill="${colors.paper}" stroke="${colors.ink}" stroke-width="7"/>
      <path d="M ${x + 24} ${y - 18} Q ${x + 58} ${y - 14} ${x + 41} ${y + 14} Q ${x + 31} ${y + 28} ${x + 25} ${y + 13}" fill="none" stroke="${colors.ink}" stroke-width="7" stroke-linecap="round"/>
      <path d="M ${x - 9} ${y - 48} q 9 -17 0 -32 M ${x + 12} ${y - 46} q 9 -17 0 -32" fill="none" stroke="${colors.cyan}" stroke-width="5" stroke-linecap="round" opacity="0.75"/>
      <path d="M ${x - 11} ${y - 4} L ${x + 12} ${y - 4}" stroke="${colors.gold}" stroke-width="5" stroke-linecap="round"/>
    </g>
  `;
}

function phone(x, y, rotate = 0) {
  return `
    <g transform="rotate(${rotate} ${x} ${y})">
      <rect x="${x - 17}" y="${y - 40}" width="34" height="82" rx="9" fill="${colors.softInk}" stroke="${colors.ink}" stroke-width="6"/>
      <rect x="${x - 10}" y="${y - 27}" width="20" height="43" rx="3" fill="#102434" stroke="${colors.cyan}" stroke-width="3"/>
      ${circle(x, y + 29, 4, colors.gold)}
    </g>
  `;
}

function football(x, y, rotate = -18) {
  return `
    <g transform="rotate(${rotate} ${x} ${y})">
      <ellipse cx="${x}" cy="${y}" rx="47" ry="27" fill="#7a4329" stroke="${colors.ink}" stroke-width="8"/>
      <path d="M ${x - 35} ${y} Q ${x} ${y - 17} ${x + 35} ${y}" fill="none" stroke="${colors.paper}" stroke-width="5" stroke-linecap="round"/>
      <path d="M ${x - 7} ${y - 11} L ${x + 8} ${y + 11}" stroke="${colors.paper}" stroke-width="4" stroke-linecap="round"/>
      <path d="M ${x - 17} ${y - 3} L ${x - 8} ${y + 5} M ${x - 3} ${y - 7} L ${x + 6} ${y + 2} M ${x + 11} ${y - 10} L ${x + 20} ${y - 1}" stroke="${colors.paper}" stroke-width="4" stroke-linecap="round"/>
    </g>
  `;
}

function whistle(x, y, rotate = 0) {
  return `
    <g transform="rotate(${rotate} ${x} ${y})">
      <path d="M ${x - 18} ${y - 7} L ${x + 10} ${y - 16} Q ${x + 25} ${y - 8} ${x + 20} ${y + 7} Q ${x + 5} ${y + 23} ${x - 18} ${y + 9} Z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="5"/>
      ${circle(x + 10, y + 2, 7, colors.ink)}
      <path d="M ${x - 19} ${y - 8} L ${x - 40} ${y - 24}" stroke="${colors.ink}" stroke-width="5" stroke-linecap="round"/>
    </g>
  `;
}

function pen(x, y, rotate = -28) {
  return `
    <g transform="rotate(${rotate} ${x} ${y})">
      <rect x="${x - 6}" y="${y - 48}" width="12" height="82" rx="4" fill="${colors.cyan}" stroke="${colors.ink}" stroke-width="4"/>
      <path d="M ${x - 6} ${y + 34} L ${x + 6} ${y + 34} L ${x} ${y + 52} Z" fill="${colors.ink}"/>
      <path d="M ${x - 6} ${y - 31} L ${x + 6} ${y - 31}" stroke="${colors.gold}" stroke-width="4"/>
    </g>
  `;
}

function tapeBoard(x = 452, y = 300) {
  return `
    <g transform="rotate(3 ${x} ${y})">
      <rect x="${x - 74}" y="${y - 58}" width="148" height="116" rx="8" fill="#102434" stroke="${colors.ink}" stroke-width="8"/>
      <path d="M ${x - 55} ${y - 25} H ${x + 55} M ${x - 55} ${y + 25} H ${x + 55} M ${x} ${y - 47} V ${y + 47}" stroke="${colors.cyan}" stroke-width="4" opacity="0.85"/>
      <path d="M ${x - 39} ${y + 18} C ${x - 7} ${y - 8}, ${x + 17} ${y + 11}, ${x + 38} ${y - 19}" fill="none" stroke="${colors.gold}" stroke-width="5" stroke-linecap="round"/>
      ${circle(x - 45, y - 30, 6, colors.gold)}
      ${circle(x + 45, y + 30, 6, colors.cyan)}
      ${circle(x + 12, y - 3, 5, colors.paper)}
    </g>
  `;
}

function frontFist(x, y) {
  return `
    <g>
      ${ellipse(x, y, 48, 39, colors.skinLight, `stroke="${colors.ink}" stroke-width="9"`)}
      <path d="M ${x - 34} ${y - 3} L ${x + 35} ${y - 3} M ${x - 22} ${y - 29} L ${x - 22} ${y + 21} M ${x} ${y - 33} L ${x} ${y + 23} M ${x + 22} ${y - 27} L ${x + 22} ${y + 20}" stroke="${colors.ink}" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
    </g>
  `;
}

function hypedPose(pose) {
  return ['celebrate', 'excited', 'rallying', 'fist-bump', 'laughing'].includes(pose);
}

function faceExpression(pose) {
  const lookLeft = ['point-left', 'pointing-at-tape', 'skeptical'].includes(pose);
  const lookRight = ['point-right', 'think', 'reviewing-tablet', 'note-taking', 'calling-play'].includes(pose);
  const downbeat = ['sad', 'disappointed', 'tired', 'facepalm', 'head-in-hands'].includes(pose);
  const intense = ['warning', 'frustrated', 'coaching-crouch', 'skeptical', 'time-out'].includes(pose);
  const hyped = ['celebrate', 'excited', 'rallying', 'fist-bump', 'laughing'].includes(pose);
  const pupilShift = lookLeft ? -5 : lookRight ? 5 : 0;
  const brows = {
    concern: ['M 251 128 Q 270 116 287 126', 'M 313 126 Q 332 116 351 128'],
    warning: ['M 251 132 Q 270 112 288 124', 'M 312 124 Q 332 112 351 132'],
    rallying: ['M 249 120 Q 270 105 290 116', 'M 310 116 Q 331 105 353 120'],
    'coaching-crouch': ['M 252 130 Q 270 116 288 124', 'M 312 124 Q 332 116 350 130'],
    'calling-play': ['M 250 123 Q 270 110 290 121', 'M 310 121 Q 332 110 354 123'],
    'time-out': ['M 251 132 Q 270 113 288 124', 'M 312 124 Q 332 113 351 132'],
    'whistle-blow': ['M 250 121 Q 270 111 288 119', 'M 312 119 Q 332 111 352 121'],
    'reviewing-tablet': ['M 253 124 Q 270 118 286 122', 'M 316 122 Q 333 118 349 124'],
    'head-in-hands': ['M 253 121 Q 270 137 288 129', 'M 312 129 Q 331 137 349 121'],
    'fist-bump': ['M 249 119 Q 270 105 290 116', 'M 310 116 Q 331 105 353 119'],
    'note-taking': ['M 253 123 Q 270 116 286 121', 'M 316 121 Q 333 116 349 123'],
    laughing: ['M 250 119 Q 270 108 290 117', 'M 310 117 Q 331 108 352 119'],
    skeptical: ['M 249 115 Q 270 102 291 117', 'M 312 130 Q 333 121 352 130'],
    proud: ['M 252 119 Q 270 110 288 116', 'M 312 116 Q 331 110 350 119'],
    facepalm: ['M 253 123 Q 270 136 288 129', 'M 312 129 Q 331 136 349 123'],
    frustrated: ['M 251 134 Q 270 115 288 127', 'M 312 127 Q 332 115 351 134'],
    tired: ['M 253 123 Q 270 133 288 128', 'M 312 128 Q 331 133 349 123'],
    'pointing-at-tape': ['M 250 124 Q 270 111 288 121', 'M 312 121 Q 332 111 352 124'],
    sad: ['M 253 121 Q 270 136 288 128', 'M 312 128 Q 331 136 349 121'],
    disappointed: ['M 253 123 Q 270 135 288 129', 'M 312 129 Q 331 135 349 123'],
    surprised: ['M 250 113 Q 270 101 290 111', 'M 310 111 Q 331 101 353 113'],
    think: ['M 250 123 Q 270 114 289 120', 'M 312 126 Q 332 113 353 122'],
  }[pose] ?? ['M 252 121 Q 270 112 288 119', 'M 312 119 Q 331 112 350 121'];

  const mouth = {
    talk: `<path d="M 272 194 Q 300 211 328 194 Q 319 224 300 224 Q 281 224 272 194 Z" fill="${colors.ink}"/><path d="M 287 213 Q 300 220 313 213" stroke="${colors.skinShade}" stroke-width="4" fill="none"/>`,
    celebrate: `<path d="M 264 195 Q 300 232 336 195 Q 323 240 300 240 Q 277 240 264 195 Z" fill="${colors.ink}"/><path d="M 282 216 Q 300 226 318 216" stroke="${colors.white}" stroke-width="5" stroke-linecap="round"/>`,
    excited: `<path d="M 264 195 Q 300 231 336 195 Q 323 238 300 238 Q 277 238 264 195 Z" fill="${colors.ink}"/><path d="M 282 216 Q 300 226 318 216" stroke="${colors.white}" stroke-width="5" stroke-linecap="round"/>`,
    rallying: `<path d="M 268 194 Q 300 214 332 194 Q 323 230 300 230 Q 277 230 268 194 Z" fill="${colors.ink}"/><path d="M 285 213 Q 300 220 315 213" stroke="${colors.white}" stroke-width="4" fill="none"/>`,
    'coaching-crouch': `<path d="M 273 208 Q 300 197 327 208" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`,
    'calling-play': `<path d="M 271 194 Q 300 212 329 194 Q 319 222 300 222 Q 281 222 271 194 Z" fill="${colors.ink}"/>`,
    'time-out': `<path d="M 275 207 Q 300 211 325 207" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`,
    'whistle-blow': `<ellipse cx="300" cy="202" rx="12" ry="10" fill="${colors.ink}"/>`,
    'coffee-sip': `<path d="M 276 201 Q 300 212 324 201" fill="none" stroke="${colors.ink}" stroke-width="7" stroke-linecap="round"/>`,
    'on-phone': `<path d="M 276 207 Q 300 201 324 207" fill="none" stroke="${colors.ink}" stroke-width="7" stroke-linecap="round"/>`,
    'reviewing-tablet': `<path d="M 276 208 Q 300 212 324 208" fill="none" stroke="${colors.ink}" stroke-width="7" stroke-linecap="round"/>`,
    'head-in-hands': `<path d="M 272 216 Q 300 198 328 216" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`,
    'fist-bump': `<path d="M 265 195 Q 300 230 335 195" fill="none" stroke="${colors.ink}" stroke-width="9" stroke-linecap="round"/>`,
    'note-taking': `<path d="M 276 207 Q 300 212 324 207" fill="none" stroke="${colors.ink}" stroke-width="7" stroke-linecap="round"/>`,
    laughing: `<path d="M 263 195 Q 300 234 337 195 Q 323 243 300 243 Q 277 243 263 195 Z" fill="${colors.ink}"/><path d="M 280 216 Q 300 229 320 216" stroke="${colors.white}" stroke-width="5" fill="none"/>`,
    skeptical: `<path d="M 272 211 Q 300 199 328 211" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`,
    proud: `<path d="M 270 199 Q 300 220 330 199" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`,
    facepalm: `<path d="M 272 216 Q 300 200 328 216" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`,
    frustrated: `<path d="M 275 209 L 325 209" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`,
    tired: `<path d="M 276 212 Q 300 202 324 212" fill="none" stroke="${colors.ink}" stroke-width="7" stroke-linecap="round"/>`,
    sad: `<path d="M 272 218 Q 300 199 328 218" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`,
    disappointed: `<path d="M 273 214 Q 300 202 327 214" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`,
    surprised: `<ellipse cx="300" cy="203" rx="16" ry="24" fill="${colors.ink}"/>`,
    concern: `<path d="M 275 207 Q 300 212 325 207" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`,
    warning: `<path d="M 275 207 Q 300 212 325 207" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`,
    think: `<path d="M 274 204 Q 300 215 326 201" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`,
  }[pose] ?? `<path d="M 269 200 Q 300 219 331 200" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`;

  const eyelids = downbeat
    ? `<path d="M 257 144 L 284 148 M 316 148 L 343 144" stroke="${colors.ink}" stroke-width="5" stroke-linecap="round" opacity="0.8"/>`
    : intense
      ? `<path d="M 254 138 L 285 144 M 346 138 L 315 144" stroke="${colors.ink}" stroke-width="4" stroke-linecap="round" opacity="0.75"/>`
      : pose === 'surprised'
        ? ''
        : `<path d="M 256 140 Q 270 136 284 141 M 316 141 Q 330 136 344 140" stroke="${colors.ink}" stroke-width="4" stroke-linecap="round" opacity="0.62"/>`;

  return `
    <path d="${brows[0]}" fill="none" stroke="${colors.ink}" stroke-width="${hyped ? 8 : 7}" stroke-linecap="round"/>
    <path d="${brows[1]}" fill="none" stroke="${colors.ink}" stroke-width="${hyped ? 8 : 7}" stroke-linecap="round"/>
    <path d="M 250 162 L 287 166 M 313 166 L 350 162" stroke="${colors.softInk}" stroke-width="8" stroke-linecap="round" opacity="0.88"/>
    ${ellipse(270, 146, pose === 'surprised' ? 13 : 12, pose === 'surprised' ? 17 : 15, colors.white, `stroke="${colors.ink}" stroke-width="5"`)}
    ${ellipse(330, 146, pose === 'surprised' ? 13 : 12, pose === 'surprised' ? 17 : 15, colors.white, `stroke="${colors.ink}" stroke-width="5"`)}
    ${circle(270 + pupilShift, downbeat ? 149 : 148, 5.8, colors.ink)}
    ${circle(330 + pupilShift, downbeat ? 149 : 148, 5.8, colors.ink)}
    ${eyelids}
    <path d="M 300 150 Q 288 170 302 174" fill="none" stroke="${colors.skinShade}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M 255 180 C 276 160 294 166 300 181 C 306 166 324 160 345 180 C 329 197 312 195 300 186 C 288 195 271 197 255 180 Z" fill="${colors.mustache}" stroke="${colors.ink}" stroke-width="5"/>
    ${mouth}
  `;
}

function baseBody(pose) {
  const slumped = ['sad', 'tired', 'facepalm', 'head-in-hands'].includes(pose);
  const crouched = pose === 'coaching-crouch';
  const shoulderY = slumped ? 250 : crouched ? 238 : 228;
  const headShiftY = slumped ? 12 : hypedPose(pose) ? -5 : 0;
  const headTilt = {
    think: 'rotate(-5 300 158)',
    warning: 'rotate(3 300 158)',
    sad: 'rotate(-7 300 158)',
    disappointed: 'rotate(5 300 158)',
    skeptical: 'rotate(-2 300 158)',
    surprised: 'rotate(-6 300 158)',
    whispering: 'rotate(-4 300 158)',
  }[pose] ?? '';
  const headTransform = [`translate(0 ${headShiftY})`, headTilt].filter((part) => part && part !== 'translate(0 0)').join(' ');

  return `
    <g id="legs">
      <path d="M 221 432 L 292 432 L 284 646 Q 257 661 221 650 Z" fill="${colors.jeans}" stroke="${colors.ink}" stroke-width="9"/>
      <path d="M 308 432 L 379 432 L 390 650 Q 354 662 318 647 Z" fill="${colors.jeans}" stroke="${colors.ink}" stroke-width="9"/>
      <path d="M 253 455 L 246 626" stroke="${colors.jeansLight}" stroke-width="6" stroke-linecap="round" opacity="0.8"/>
      <path d="M 346 455 L 358 626" stroke="${colors.jeansLight}" stroke-width="6" stroke-linecap="round" opacity="0.8"/>
      <path d="M 202 638 Q 247 619 294 649 L 288 686 L 181 686 Q 178 655 202 638 Z" fill="${colors.sneaker}" stroke="${colors.ink}" stroke-width="9"/>
      <path d="M 316 650 Q 363 619 407 640 Q 431 657 420 686 L 314 687 Z" fill="${colors.sneaker}" stroke="${colors.ink}" stroke-width="9"/>
      <path d="M 215 657 L 281 657 M 330 657 L 399 657" stroke="${colors.sneakerBlue}" stroke-width="9" stroke-linecap="round"/>
      <path d="M 228 675 L 274 675 M 342 675 L 390 675" stroke="${colors.ink}" stroke-width="5" stroke-linecap="round"/>
    </g>
    <g id="torso">
      <path d="M 166 ${shoulderY} Q 300 168 434 ${shoulderY} L 458 410 Q 407 466 300 476 Q 193 466 142 410 Z" fill="${colors.polo}" stroke="${colors.ink}" stroke-width="11"/>
      <path d="M 171 ${shoulderY + 22} Q 300 188 429 ${shoulderY + 22} L 412 416 Q 366 452 300 458 Q 234 452 188 416 Z" fill="${colors.jacketShadow}" opacity="0.42"/>
      <path d="M 206 ${shoulderY + 28} Q 300 206 394 ${shoulderY + 28} L 370 448 Q 300 468 230 448 Z" fill="${colors.jerseyPanel}" stroke="${colors.ink}" stroke-width="8"/>
      <path d="M 184 ${shoulderY + 10} Q 232 205 274 221 L 242 442 Q 196 430 162 400 Z" fill="${colors.redHot}" stroke="${colors.ink}" stroke-width="6"/>
      <path d="M 416 ${shoulderY + 10} Q 368 205 326 221 L 358 442 Q 404 430 438 400 Z" fill="${colors.polo}" stroke="${colors.ink}" stroke-width="6"/>
      <path d="M 206 ${shoulderY + 42} C 239 285 251 354 242 431" fill="none" stroke="${colors.gold}" stroke-width="10" stroke-linecap="round" opacity="0.96"/>
      <path d="M 394 ${shoulderY + 42} C 361 285 349 354 358 431" fill="none" stroke="${colors.cyan}" stroke-width="10" stroke-linecap="round" opacity="0.96"/>
      <path d="M 250 215 L 300 269 L 350 215" fill="none" stroke="${colors.ink}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 273 220 Q 300 251 327 220 L 321 282 L 279 282 Z" fill="${colors.poloLight}" stroke="${colors.ink}" stroke-width="7"/>
      <path d="M 282 258 L 300 305 L 318 258" fill="none" stroke="${colors.gold}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      ${circle(300, 310, 10, colors.gold, `stroke="${colors.ink}" stroke-width="4"`)}
      ${circle(300, 310, 4, colors.ink)}
      <rect x="257" y="336" width="86" height="34" rx="6" fill="${colors.ink}" stroke="${colors.gold}" stroke-width="5"/>
      <path d="M 270 353 L 293 353 M 309 353 L 332 353" stroke="${colors.cyan}" stroke-width="6" stroke-linecap="round"/>
      <path d="M 198 406 Q 300 444 402 406" fill="none" stroke="${colors.poloShade}" stroke-width="9" opacity="0.65" stroke-linecap="round"/>
      <path d="M 238 462 L 362 462" stroke="${colors.ink}" stroke-width="12" stroke-linecap="round"/>
      <rect x="276" y="449" width="48" height="28" rx="4" fill="${colors.clipboard}" stroke="${colors.ink}" stroke-width="5"/>
      <path d="M 284 459 L 316 459" stroke="${colors.gold}" stroke-width="4" stroke-linecap="round"/>
    </g>
    <g id="neck">
      <path d="M 268 194 L 332 194 L 339 231 Q 300 253 261 231 Z" fill="${colors.skin}" stroke="${colors.ink}" stroke-width="8"/>
    </g>
    <g id="head"${headTransform ? ` transform="${headTransform}"` : ''}>
      ${ellipse(218, 154, 18, 25, colors.skinLight, `stroke="${colors.ink}" stroke-width="7"`)}
      ${ellipse(382, 154, 18, 25, colors.skinLight, `stroke="${colors.ink}" stroke-width="7"`)}
      <path d="M 232 127 C 236 87 264 60 304 61 C 348 62 374 93 374 139 C 374 180 352 212 318 224 C 304 231 286 228 270 219 C 245 205 229 172 232 127 Z" fill="${colors.skinLight}" stroke="${colors.ink}" stroke-width="9"/>
      <path d="M 230 123 Q 255 72 309 58 Q 363 67 378 126 Q 345 111 301 111 Q 260 111 230 139 Z" fill="${colors.cap}" stroke="${colors.ink}" stroke-width="7"/>
      <path d="M 252 105 Q 300 80 350 106 Q 329 128 300 130 Q 271 128 252 105 Z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="7"/>
      <path d="M 268 92 Q 300 70 335 93" fill="none" stroke="${colors.capPanel}" stroke-width="18" stroke-linecap="round" opacity="0.9"/>
      <path d="M 284 84 L 300 103 L 316 84" fill="none" stroke="${colors.cyan}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 237 138 Q 231 169 248 190" fill="none" stroke="${colors.hair}" stroke-width="12" stroke-linecap="round"/>
      <path d="M 363 135 Q 373 166 354 191" fill="none" stroke="${colors.hair}" stroke-width="12" stroke-linecap="round"/>
      ${faceExpression(pose)}
      <path d="M 216 154 C 220 88 260 54 305 56 C 351 58 382 91 386 154" fill="none" stroke="${colors.headset}" stroke-width="12" stroke-linecap="round"/>
      <path d="M 216 154 C 220 88 260 54 305 56 C 351 58 382 91 386 154" fill="none" stroke="${colors.cyan}" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
      <rect x="200" y="132" width="30" height="54" rx="9" fill="${colors.headset}" stroke="${colors.ink}" stroke-width="6"/>
      <rect x="370" y="132" width="30" height="54" rx="9" fill="${colors.headset}" stroke="${colors.ink}" stroke-width="6"/>
      <path d="M 386 181 Q 380 213 343 221" fill="none" stroke="${colors.mic}" stroke-width="7" stroke-linecap="round"/>
      <path d="M 380 137 L 391 137 M 210 137 L 221 137" stroke="${colors.gold}" stroke-width="5" stroke-linecap="round"/>
      ${circle(339, 222, 8, colors.mic)}
    </g>
  `;
}

function armLayer(pose) {
  const leftShoulder = [186, 252];
  const rightShoulder = [414, 252];
  const arm = (points, handKind = 'fist', tattoo = false) => {
    const [shoulder, elbow, palm] = points;
    return `
      ${stroke([shoulder, elbow], colors.ink, 45)}
      ${stroke([shoulder, elbow], colors.polo, 35)}
      ${stroke([elbow, palm], colors.ink, 36)}
      ${stroke([elbow, palm], colors.skinLight, 27)}
      ${tattoo ? `<path d="M ${elbow[0] + 6} ${elbow[1] + 16} q 16 8 31 -5" fill="none" stroke="${colors.tattoo}" stroke-width="5" stroke-linecap="round" opacity="0.82"/>` : ''}
      ${hand(palm[0], palm[1], handKind)}
    `;
  };

  switch (pose) {
    case 'talk':
      return `${arm([leftShoulder, [158, 318], [184, 392]])}${clipboard(169, 352)}${arm([rightShoulder, [466, 296], [512, 326]], 'open', true)}`;
    case 'celebrate':
      return `${arm([leftShoulder, [158, 136], [172, 62]], 'fist')}${arm([rightShoulder, [442, 136], [428, 62]], 'fist', true)}`;
    case 'concern':
      return `
        ${stroke([[198, 265], [265, 322], [360, 303]], colors.polo, 36)}
        ${stroke([[225, 326], [318, 304], [402, 336]], colors.skinLight, 27)}
        ${hand(365, 304, 'fist')}
        ${hand(230, 336, 'fist')}
      `;
    case 'disappointed':
      return `${arm([[188, 270], [160, 338], [174, 428]], 'fist')}${arm([[412, 270], [438, 340], [418, 428]], 'fist', true)}`;
    case 'excited':
      return `${arm([leftShoulder, [150, 160], [122, 102]], 'open')}${arm([rightShoulder, [450, 160], [478, 102]], 'open', true)}`;
    case 'greeting':
    case 'wave':
      return `${arm([leftShoulder, [164, 319], [185, 388]])}${clipboard(170, 346)}${arm([rightShoulder, [454, 178], [500, 120]], 'open', true)}`;
    case 'mic-check':
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [424, 212], [386, 164]], 'fist', true)}`;
    case 'point-left':
      return `${arm([leftShoulder, [120, 270], [70, 300]], 'point')}${arm([rightShoulder, [426, 328], [398, 420]], 'fist', true)}${clipboard(392, 372, 9)}`;
    case 'point-right':
      return `${arm([leftShoulder, [158, 318], [184, 392]])}${clipboard(169, 352)}${arm([rightShoulder, [482, 270], [530, 300]], 'point', true)}`;
    case 'sad':
      return `${arm([[188, 278], [156, 380], [168, 488]], 'fist')}${arm([[412, 278], [444, 382], [426, 488]], 'fist', true)}`;
    case 'surprised':
      return `${arm([leftShoulder, [184, 210], [218, 164]], 'open')}${arm([rightShoulder, [416, 210], [382, 164]], 'open', true)}`;
    case 'think':
      return `${arm([leftShoulder, [158, 318], [184, 392]])}${clipboard(169, 352)}${arm([rightShoulder, [386, 224], [342, 197]], 'fist', true)}`;
    case 'thumbs-up':
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [456, 300], [486, 232]], 'thumb', true)}`;
    case 'warning':
      return `${arm([leftShoulder, [158, 318], [184, 392]])}${clipboard(169, 352)}${arm([rightShoulder, [466, 224], [492, 184]], 'point', true)}`;
    case 'whispering':
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [400, 220], [366, 178]], 'open', true)}`;
    case 'rallying':
      return `${arm([leftShoulder, [158, 128], [176, 52]], 'fist')}${arm([rightShoulder, [442, 128], [424, 52]], 'fist', true)}`;
    case 'coaching-crouch':
      return `${arm([[198, 262], [162, 360], [200, 430]], 'fist')}${arm([[402, 262], [438, 360], [400, 430]], 'fist', true)}`;
    case 'calling-play':
      return `${arm([leftShoulder, [176, 254], [225, 307]], 'open')}${arm([rightShoulder, [424, 240], [380, 302]], 'open', true)}${clipboard(300, 322, -2)}`;
    case 'time-out':
      return `
        ${stroke([[198, 250], [250, 210], [300, 210]], colors.polo, 35)}
        ${stroke([[402, 250], [350, 210], [300, 210]], colors.polo, 35)}
        ${stroke([[250, 210], [300, 210]], colors.skinLight, 27)}
        ${stroke([[350, 210], [300, 210]], colors.skinLight, 27)}
        ${hand(300, 210, 'open')}
        ${stroke([[300, 175], [300, 247]], colors.skinLight, 23)}
        ${hand(300, 171, 'open')}
      `;
    case 'whistle-blow':
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [424, 220], [363, 181]], 'open', true)}${whistle(314, 190, -8)}`;
    case 'coffee-sip':
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [424, 238], [366, 190]], 'fist', true)}${mug(365, 184, -12)}`;
    case 'on-phone':
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [435, 216], [382, 136]], 'fist', true)}${phone(390, 136, 12)}`;
    case 'reviewing-tablet':
      return `${arm([leftShoulder, [214, 316], [240, 382]], 'fist')}${arm([rightShoulder, [386, 316], [360, 382]], 'fist', true)}${tablet(300, 363, 0, 1.05)}`;
    case 'head-in-hands':
      return `${arm([[198, 268], [217, 214], [246, 156]], 'open')}${arm([[402, 268], [383, 214], [354, 156]], 'open', true)}`;
    case 'fist-bump':
      return `${arm([leftShoulder, [158, 318], [184, 392]])}${clipboard(169, 352)}${stroke([[414, 252], [456, 248], [500, 258]], colors.ink, 45)}${stroke([[414, 252], [456, 248]], colors.polo, 35)}${stroke([[456, 248], [500, 258]], colors.skinLight, 29)}${frontFist(511, 260)}`;
    case 'note-taking':
      return `${arm([leftShoulder, [158, 320], [190, 386]])}${clipboard(186, 364, -6)}${arm([rightShoulder, [385, 312], [252, 352]], 'fist', true)}${pen(268, 343, -62)}`;
    case 'laughing':
      return `${arm([leftShoulder, [154, 300], [210, 366]], 'open')}${arm([rightShoulder, [446, 300], [390, 366]], 'open', true)}`;
    case 'skeptical':
      return `
        ${stroke([[198, 265], [265, 322], [360, 303]], colors.polo, 36)}
        ${stroke([[225, 326], [318, 304], [402, 336]], colors.skinLight, 27)}
        ${hand(365, 304, 'fist')}
        ${hand(230, 336, 'fist')}
      `;
    case 'proud':
      return `${arm([leftShoulder, [170, 320], [202, 420]], 'fist')}${arm([rightShoulder, [430, 320], [398, 420]], 'fist', true)}`;
    case 'facepalm':
      return `${arm([[198, 268], [224, 225], [280, 158]], 'open')}${arm([[402, 268], [438, 374], [430, 474]], 'fist', true)}`;
    case 'frustrated':
      return `${arm([leftShoulder, [150, 330], [146, 430]], 'fist')}${arm([rightShoulder, [450, 330], [454, 430]], 'fist', true)}`;
    case 'tired':
      return `${arm([[198, 268], [170, 344], [178, 444]], 'fist')}${arm([[402, 268], [388, 220], [348, 166]], 'open', true)}${mug(178, 443, 5)}`;
    case 'football-in-hand':
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [440, 300], [470, 382]], 'fist', true)}${football(477, 378, -16)}`;
    case 'pointing-at-tape':
      return `${tapeBoard(452, 305)}${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [462, 270], [510, 302]], 'open', true)}`;
    case 'idle':
    default:
      return `${arm([leftShoulder, [158, 318], [184, 392]])}${clipboard(169, 352)}${arm([rightShoulder, [444, 326], [418, 416]], 'fist', true)}`;
  }
}

function poseExtras(pose) {
  const marks = {
    celebrate: `<path d="M 120 88 L 92 56 M 472 84 L 506 52" stroke="${colors.gold}" stroke-width="10" stroke-linecap="round"/>`,
    excited: `<path d="M 104 178 L 70 152 M 497 178 L 530 152" stroke="${colors.cyan}" stroke-width="8" stroke-linecap="round"/>`,
    rallying: `<path d="M 101 112 L 68 83 M 499 112 L 532 83 M 300 64 L 300 28" stroke="${colors.gold}" stroke-width="9" stroke-linecap="round"/>`,
    'time-out': `<path d="M 280 112 L 320 112 M 300 92 L 300 136" stroke="${colors.gold}" stroke-width="8" stroke-linecap="round"/>`,
    'whistle-blow': `<path d="M 382 185 L 420 162 M 389 207 L 431 208" stroke="${colors.cyan}" stroke-width="6" stroke-linecap="round"/>`,
    laughing: `<path d="M 136 132 L 104 105 M 465 132 L 498 105" stroke="${colors.cyan}" stroke-width="7" stroke-linecap="round"/>`,
    proud: `<path d="M 118 183 L 90 170 M 482 183 L 510 170" stroke="${colors.gold}" stroke-width="7" stroke-linecap="round"/>`,
    frustrated: `<path d="M 96 248 L 68 238 M 504 248 L 532 238" stroke="#e85f5f" stroke-width="8" stroke-linecap="round"/>`,
    warning: `<path d="M 505 174 L 526 143 M 523 205 L 560 194" stroke="${colors.gold}" stroke-width="7" stroke-linecap="round"/>`,
    surprised: `<path d="M 144 128 L 112 96 M 455 128 L 488 96" stroke="${colors.cyan}" stroke-width="8" stroke-linecap="round"/>`,
  };
  return marks[pose] ?? '';
}

function svgForPose(pose, variant) {
  const spec = variant === 'inline' ? INLINE : FULL;
  const frameTransform = variant === 'full' ? FULL_BODY_STAGE_TRANSFORM : '';
  const postureTransform = pose === 'coaching-crouch'
    ? 'translate(0 58) scale(1 0.92)'
    : ['sad', 'tired', 'facepalm', 'head-in-hands'].includes(pose)
      ? 'translate(0 10)'
      : '';
  const frameOpen = frameTransform ? `<g transform="${frameTransform}">` : '<g>';
  const postureOpen = postureTransform ? `<g transform="${postureTransform}">` : '<g>';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="${spec.viewBox}">
  ${frameOpen}
    ${postureOpen}
      ${baseBody(pose)}
      ${armLayer(pose)}
      ${poseExtras(pose)}
    </g>
  </g>
</svg>`;
}

async function renderSvg(page, svg, outPath, spec) {
  if (sharp) {
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    return;
  }
  if (canUseSips()) {
    await renderSvgWithSips(svg, outPath);
    return;
  }
  if (!page) {
    throw new Error('Chip art generation requires sharp, playwright, or macOS sips to render SVG.');
  }
  await page.setViewportSize({ width: spec.width, height: spec.height });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.locator('svg').screenshot({
    path: outPath,
    omitBackground: true,
    animations: 'disabled',
  });
}

async function renderSvgWithSips(svg, outPath) {
  const tempDir = await mkdtemp(resolve(tmpdir(), 'chip-art-'));
  const svgPath = resolve(tempDir, 'source.svg');

  try {
    await writeFile(svgPath, svg, 'utf8');
    const result = spawnSync(SIPS_BIN, ['-s', 'format', 'png', svgPath, '--out', outPath], {
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      throw new Error(`sips could not render SVG: ${result.stderr || result.stdout || `exit ${result.status}`}`);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function dataUrl(filePath) {
  const data = await readFile(filePath);
  return `data:image/png;base64,${data.toString('base64')}`;
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function renderContactSheetWithSharp(outPath) {
  const rowHeight = 144;
  const width = 1320;
  const height = 70 + POSES.length * rowHeight;
  const rows = (await Promise.all(POSES.map(async ([pose, fileName], index) => {
    const y = 58 + index * rowHeight;
    const fullSrc = await dataUrl(resolve(CHIP_DIR, fileName));
    const inlineSrc = await dataUrl(resolve(INLINE_DIR, fileName));
    return `
      <g transform="translate(0 ${y})">
        <rect x="24" y="0" width="1272" height="130" rx="0" fill="#0b1520" stroke="#244457" stroke-width="2"/>
        <text x="44" y="66" fill="#42d9e8" font-size="17" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${escapeXml(pose)}</text>
        <text x="222" y="24" fill="#f0c341" font-size="12" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">FULL BODY</text>
        <text x="740" y="24" fill="#f0c341" font-size="12" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">INLINE CROP</text>
        <rect x="222" y="32" width="500" height="88" fill="#101c28" stroke="#31516a"/>
        <rect x="740" y="32" width="500" height="88" fill="#101c28" stroke="#31516a"/>
        <image href="${fullSrc}" x="386" y="35" width="214" height="82" preserveAspectRatio="xMidYMid meet"/>
        <image href="${inlineSrc}" x="944" y="34" height="84" width="84" preserveAspectRatio="xMidYMid meet"/>
      </g>
    `;
  }))).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#071019"/>
    <text x="24" y="36" fill="#f5c842" font-size="24" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">Chip Art v3 Contact Sheet: full-body / inline crop</text>
    ${rows}
  </svg>`;
  if (sharp) {
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    return;
  }
  if (canUseSips()) {
    await renderSvgWithSips(svg, outPath);
    return;
  }
  throw new Error('Chip contact sheet generation requires sharp, playwright, or macOS sips.');
}

async function renderContactSheet(page, outPath) {
  if (sharp || canUseSips()) {
    await renderContactSheetWithSharp(outPath);
    return;
  }
  if (!page) {
    throw new Error('Chip contact sheet generation requires sharp, playwright, or macOS sips.');
  }
  const rows = (await Promise.all(POSES.map(async ([pose, fileName]) => {
    const fullSrc = await dataUrl(resolve(CHIP_DIR, fileName));
    const inlineSrc = await dataUrl(resolve(INLINE_DIR, fileName));
    return `
    <div class="pose-row">
      <div class="pose-label">${pose}</div>
      <div class="cell full"><img src="${fullSrc}" /></div>
      <div class="cell inline"><img src="${inlineSrc}" /></div>
    </div>
  `;
  }))).join('');
  await page.setViewportSize({ width: 1320, height: 2200 });
  await page.setContent(`<!doctype html>
    <html>
      <body>
        <style>
          body {
            margin: 0;
            padding: 24px;
            background: #071019;
            color: #f5c842;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
          h1 { margin: 0 0 18px; font-size: 24px; letter-spacing: 0; }
          .sheet { display: grid; gap: 12px; }
          .pose-row {
            display: grid;
            grid-template-columns: 180px 500px 500px;
            gap: 18px;
            align-items: center;
            min-height: 130px;
            border: 2px solid #244457;
            background: #0b1520;
            padding: 10px;
          }
          .pose-label { color: #42d9e8; font-size: 17px; }
          .cell {
            height: 108px;
            display: grid;
            place-items: center;
            background: #101c28;
            border: 1px solid #31516a;
          }
          .cell.full img { height: 102px; width: auto; }
          .cell.inline img { height: 96px; width: 96px; object-fit: contain; }
        </style>
        <h1>Chip Art v3 Contact Sheet: full-body / inline crop</h1>
        <div class="sheet">${rows}</div>
      </body>
    </html>`);
  await page.screenshot({
    path: outPath,
    fullPage: true,
    animations: 'disabled',
  });
}

async function main() {
  await mkdir(CHIP_DIR, { recursive: true });
  await mkdir(INLINE_DIR, { recursive: true });

  if (!sharp && !playwright && !canUseSips()) {
    throw new Error('Chip art generation requires sharp, playwright, or macOS sips.');
  }

  const browser = sharp || canUseSips() ? null : await playwright.chromium.launch({ headless: true });
  const page = browser ? await browser.newPage({ deviceScaleFactor: 1 }) : null;
  try {
    for (const [pose, fileName] of POSES) {
      const fullPath = resolve(CHIP_DIR, fileName);
      const inlinePath = resolve(INLINE_DIR, fileName);
      if (REGENERATE_EXISTING || !(await fileExists(fullPath))) {
        await renderSvg(page, svgForPose(pose, 'full'), fullPath, FULL);
      }
      if (REGENERATE_EXISTING || !(await fileExists(inlinePath))) {
        await renderSvg(page, svgForPose(pose, 'inline'), inlinePath, INLINE);
      }
    }
    if (CONTACT_SHEET) {
      await mkdir(resolve(CONTACT_SHEET, '..'), { recursive: true });
      await renderContactSheet(page, CONTACT_SHEET);
    }
  } finally {
    await browser?.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
