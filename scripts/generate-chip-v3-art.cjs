const { chromium } = require('playwright');
const { mkdir, readFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const ROOT = resolve(__dirname, '..');
const CHIP_DIR = resolve(ROOT, 'apps/web/public/assets/chip');
const INLINE_DIR = resolve(CHIP_DIR, 'inline');
const CONTACT_SHEET = process.env.CHIP_ART_CONTACT_SHEET
  ? resolve(process.env.CHIP_ART_CONTACT_SHEET)
  : null;
const FULL = { width: 600, height: 732, viewBox: '0 0 600 732' };
const INLINE = { width: 600, height: 600, viewBox: '85 22 430 430' };

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
];

const colors = {
  ink: '#171920',
  softInk: '#2d3037',
  skin: '#c98556',
  skinLight: '#e0a06f',
  skinShade: '#9a5d3f',
  hair: '#57514b',
  hairLight: '#bbb0a2',
  mustache: '#3f3a34',
  polo: '#b99a62',
  poloShade: '#947a4f',
  poloLight: '#d1b782',
  jeans: '#18334a',
  jeansLight: '#285173',
  sneaker: '#b59a71',
  sneakerBlue: '#214866',
  clipboard: '#b68442',
  paper: '#e1c78e',
  headset: '#22262d',
  mic: '#101318',
  tattoo: '#6d5f51',
  cyan: '#42d9e8',
  gold: '#d2ad35',
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

function hand(x, y, kind = 'open') {
  const fingers = kind === 'open'
    ? [
      stroke([[x - 10, y - 8], [x - 22, y - 18]], colors.ink, 4),
      stroke([[x - 4, y - 12], [x - 9, y - 27]], colors.ink, 4),
      stroke([[x + 4, y - 12], [x + 7, y - 27]], colors.ink, 4),
    ].join('')
    : '';
  const thumb = kind === 'thumb'
    ? stroke([[x + 5, y - 4], [x + 12, y - 28]], colors.ink, 6)
    : '';
  return `
    ${ellipse(x, y, 18, 15, colors.skinLight, `stroke="${colors.ink}" stroke-width="5"`)}
    ${fingers}
    ${thumb}
  `;
}

function clipboard(x = 165, y = 332, rotate = -9) {
  return `
    <g transform="rotate(${rotate} ${x} ${y})">
      <rect x="${x - 52}" y="${y - 72}" width="104" height="144" rx="9" fill="${colors.clipboard}" stroke="${colors.ink}" stroke-width="8"/>
      <rect x="${x - 39}" y="${y - 55}" width="78" height="112" rx="4" fill="${colors.paper}" stroke="${colors.ink}" stroke-width="4"/>
      <path d="M ${x - 25} ${y - 12} C ${x} ${y - 30}, ${x + 15} ${y + 4}, ${x + 32} ${y - 18}" fill="none" stroke="${colors.ink}" stroke-width="4" stroke-linecap="round"/>
      <path d="M ${x - 31} ${y + 8} L ${x + 30} ${y + 8} M ${x - 22} ${y + 28} L ${x + 22} ${y + 28}" stroke="${colors.ink}" stroke-width="4" stroke-linecap="round"/>
      <g fill="none" stroke="${colors.ink}" stroke-width="4" stroke-linecap="round">
        <path d="M ${x - 28} ${y - 34} L ${x - 14} ${y - 20} M ${x - 14} ${y - 34} L ${x - 28} ${y - 20}"/>
        <path d="M ${x + 8} ${y - 42} L ${x + 22} ${y - 28} M ${x + 22} ${y - 42} L ${x + 8} ${y - 28}"/>
        <circle cx="${x - 22}" cy="${y + 48}" r="5"/>
        <circle cx="${x}" cy="${y + 48}" r="5"/>
        <circle cx="${x + 22}" cy="${y + 48}" r="5"/>
      </g>
      <path d="M ${x - 23} ${y - 82} L ${x + 23} ${y - 82} Q ${x + 15} ${y - 106} ${x} ${y - 90} Q ${x - 15} ${y - 106} ${x - 23} ${y - 82} Z" fill="${colors.softInk}" stroke="${colors.ink}" stroke-width="5"/>
    </g>
  `;
}

function faceExpression(pose) {
  const lookLeft = pose === 'point-left';
  const lookRight = ['point-right', 'think'].includes(pose);
  const pupilShift = lookLeft ? -4 : lookRight ? 4 : 0;
  const brows = {
    concern: ['M 253 128 Q 268 116 283 123', 'M 318 123 Q 333 116 348 128'],
    warning: ['M 253 126 Q 270 114 285 124', 'M 318 124 Q 334 114 349 126'],
    sad: ['M 254 120 Q 270 132 286 126', 'M 316 126 Q 332 132 348 120'],
    disappointed: ['M 254 122 Q 270 132 286 128', 'M 316 128 Q 332 132 348 122'],
    surprised: ['M 252 112 Q 270 101 288 111', 'M 314 111 Q 333 101 351 112'],
  }[pose] ?? ['M 254 120 Q 270 113 286 120', 'M 316 120 Q 333 113 350 120'];

  const mouth = {
    talk: `<path d="M 270 184 Q 300 203 330 184 Q 318 219 300 219 Q 281 219 270 184 Z" fill="${colors.ink}"/><path d="M 286 206 Q 300 214 314 206" stroke="${colors.skinShade}" stroke-width="4" fill="none"/>`,
    celebrate: `<path d="M 266 181 Q 300 224 334 181" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`,
    excited: `<path d="M 264 181 Q 300 220 336 181" fill="none" stroke="${colors.ink}" stroke-width="8" stroke-linecap="round"/>`,
    sad: `<path d="M 274 201 Q 300 184 326 201" fill="none" stroke="${colors.ink}" stroke-width="7" stroke-linecap="round"/>`,
    disappointed: `<path d="M 274 198 Q 300 187 326 198" fill="none" stroke="${colors.ink}" stroke-width="7" stroke-linecap="round"/>`,
    surprised: `<ellipse cx="300" cy="193" rx="15" ry="23" fill="${colors.ink}"/>`,
    concern: `<path d="M 276 194 Q 300 199 324 194" fill="none" stroke="${colors.ink}" stroke-width="7" stroke-linecap="round"/>`,
    warning: `<path d="M 276 194 Q 300 198 324 194" fill="none" stroke="${colors.ink}" stroke-width="7" stroke-linecap="round"/>`,
  }[pose] ?? `<path d="M 270 187 Q 300 210 330 187" fill="none" stroke="${colors.ink}" stroke-width="7" stroke-linecap="round"/>`;

  return `
    <path d="${brows[0]}" fill="none" stroke="${colors.ink}" stroke-width="6" stroke-linecap="round"/>
    <path d="${brows[1]}" fill="none" stroke="${colors.ink}" stroke-width="6" stroke-linecap="round"/>
    ${ellipse(270, 145, 11, 14, '#ffffff', `stroke="${colors.ink}" stroke-width="4"`)}
    ${ellipse(330, 145, 11, 14, '#ffffff', `stroke="${colors.ink}" stroke-width="4"`)}
    ${circle(270 + pupilShift, 147, 5, colors.ink)}
    ${circle(330 + pupilShift, 147, 5, colors.ink)}
    <path d="M 300 148 Q 289 166 301 170" fill="none" stroke="${colors.skinShade}" stroke-width="5" stroke-linecap="round"/>
    <path d="M 260 178 Q 300 162 340 178 Q 327 193 300 193 Q 273 193 260 178 Z" fill="${colors.mustache}" stroke="${colors.ink}" stroke-width="4"/>
    ${mouth}
  `;
}

function baseBody(pose) {
  const slumped = pose === 'sad';
  const shoulderY = slumped ? 248 : 228;
  const headY = slumped ? 142 : 128;

  return `
    <g id="legs">
      <path d="M 232 432 L 292 432 L 286 646 Q 258 659 229 646 Z" fill="${colors.jeans}" stroke="${colors.ink}" stroke-width="8"/>
      <path d="M 308 432 L 369 432 L 378 646 Q 348 661 320 647 Z" fill="${colors.jeans}" stroke="${colors.ink}" stroke-width="8"/>
      <path d="M 255 455 L 250 628" stroke="${colors.jeansLight}" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
      <path d="M 340 455 L 350 628" stroke="${colors.jeansLight}" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
      <path d="M 212 640 Q 250 624 290 651 L 284 683 L 191 682 Q 188 655 212 640 Z" fill="${colors.sneaker}" stroke="${colors.ink}" stroke-width="8"/>
      <path d="M 319 651 Q 360 624 398 642 Q 420 656 411 682 L 319 684 Z" fill="${colors.sneaker}" stroke="${colors.ink}" stroke-width="8"/>
      <path d="M 221 657 L 277 657 M 333 657 L 389 657" stroke="${colors.sneakerBlue}" stroke-width="8" stroke-linecap="round"/>
      <path d="M 230 673 L 274 673 M 340 673 L 386 673" stroke="${colors.ink}" stroke-width="4" stroke-linecap="round"/>
    </g>
    <g id="torso">
      <path d="M 196 ${shoulderY} Q 300 178 404 ${shoulderY} L 430 405 Q 394 455 300 462 Q 206 455 170 405 Z" fill="${colors.polo}" stroke="${colors.ink}" stroke-width="8"/>
      <path d="M 208 ${shoulderY + 10} Q 300 202 392 ${shoulderY + 10}" fill="none" stroke="${colors.poloLight}" stroke-width="7" stroke-linecap="round" opacity="0.55"/>
      <path d="M 257 217 L 300 262 L 343 217" fill="none" stroke="${colors.ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 276 222 Q 300 244 324 222 L 319 275 L 281 275 Z" fill="${colors.poloLight}" stroke="${colors.ink}" stroke-width="5"/>
      ${circle(300, 279, 4, colors.ink)}
      ${circle(300, 300, 4, colors.ink)}
      <path d="M 210 402 Q 300 433 392 402" fill="none" stroke="${colors.poloShade}" stroke-width="7" opacity="0.5" stroke-linecap="round"/>
      <path d="M 244 455 L 356 455" stroke="${colors.ink}" stroke-width="10" stroke-linecap="round"/>
      <rect x="280" y="445" width="42" height="24" rx="4" fill="${colors.clipboard}" stroke="${colors.ink}" stroke-width="5"/>
    </g>
    <g id="neck">
      <path d="M 270 194 L 330 194 L 338 229 Q 300 250 262 229 Z" fill="${colors.skin}" stroke="${colors.ink}" stroke-width="7"/>
    </g>
    <g id="head">
      ${ellipse(300, headY + 28, 79, 92, colors.skinLight, `stroke="${colors.ink}" stroke-width="8"`)}
      ${ellipse(218, headY + 37, 17, 24, colors.skinLight, `stroke="${colors.ink}" stroke-width="6"`)}
      ${ellipse(382, headY + 37, 17, 24, colors.skinLight, `stroke="${colors.ink}" stroke-width="6"`)}
      <path d="M 226 ${headY - 15} Q 260 ${headY - 78} 331 ${headY - 50} Q 368 ${headY - 34} 377 ${headY + 18} Q 344 ${headY - 3} 300 ${headY - 2} Q 260 ${headY - 8} 226 ${headY + 28} Z" fill="${colors.hair}" stroke="${colors.ink}" stroke-width="7"/>
      <path d="M 238 ${headY - 10} Q 283 ${headY - 58} 338 ${headY - 43}" fill="none" stroke="${colors.hairLight}" stroke-width="8" stroke-linecap="round"/>
      ${faceExpression(pose)}
      <path d="M 385 ${headY + 20} Q 412 ${headY + 56} 396 ${headY + 98}" fill="none" stroke="${colors.headset}" stroke-width="12" stroke-linecap="round"/>
      <rect x="377" y="${headY + 31}" width="28" height="52" rx="8" fill="${colors.headset}" stroke="${colors.ink}" stroke-width="5"/>
      <path d="M 391 ${headY + 84} Q 385 ${headY + 114} 346 ${headY + 124}" fill="none" stroke="${colors.mic}" stroke-width="6" stroke-linecap="round"/>
      ${circle(342, headY + 125, 7, colors.mic)}
      <path d="M 223 ${headY + 16} L 190 ${headY - 12}" stroke="${colors.clipboard}" stroke-width="8" stroke-linecap="round"/>
      <path d="M 223 ${headY + 16} L 190 ${headY - 12}" stroke="${colors.ink}" stroke-width="3" stroke-linecap="round"/>
    </g>
  `;
}

function armLayer(pose) {
  const leftShoulder = [200, 250];
  const rightShoulder = [400, 250];
  const arm = (points, handKind = 'fist', tattoo = false) => {
    const [shoulder, elbow, palm] = points;
    return `
      ${stroke([shoulder, elbow], colors.polo, 35)}
      ${stroke([shoulder, elbow], colors.ink, 43, 'opacity="0.18"')}
      ${stroke([elbow, palm], colors.skinLight, 27)}
      ${stroke([elbow, palm], colors.ink, 34, 'opacity="0.18"')}
      ${tattoo ? `<path d="M ${elbow[0] + 6} ${elbow[1] + 16} q 15 8 29 -5" fill="none" stroke="${colors.tattoo}" stroke-width="5" stroke-linecap="round" opacity="0.75"/>` : ''}
      ${hand(palm[0], palm[1], handKind)}
    `;
  };

  switch (pose) {
    case 'talk':
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [463, 298], [512, 328]], 'open', true)}`;
    case 'celebrate':
      return `${arm([leftShoulder, [168, 145], [188, 70]], 'fist')}${arm([rightShoulder, [433, 142], [415, 68]], 'fist', true)}`;
    case 'concern':
      return `
        ${stroke([[198, 265], [265, 322], [360, 303]], colors.polo, 36)}
        ${stroke([[225, 326], [318, 304], [402, 336]], colors.skinLight, 27)}
        ${hand(365, 304, 'fist')}
        ${hand(230, 336, 'fist')}
      `;
    case 'disappointed':
      return `${arm([leftShoulder, [168, 318], [176, 405]], 'fist')}${arm([rightShoulder, [426, 333], [393, 413]], 'fist', true)}`;
    case 'excited':
      return `${arm([leftShoulder, [150, 160], [122, 102]], 'open')}${arm([rightShoulder, [450, 160], [478, 102]], 'open', true)}`;
    case 'greeting':
    case 'wave':
      return `${arm([leftShoulder, [164, 319], [185, 388]])}${clipboard(170, 346)}${arm([rightShoulder, [454, 178], [500, 120]], 'open', true)}`;
    case 'mic-check':
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [424, 212], [386, 164]], 'fist', true)}`;
    case 'point-left':
      return `${arm([leftShoulder, [118, 274], [62, 304]], 'open')}${arm([rightShoulder, [424, 331], [398, 417]], 'fist', true)}${clipboard(392, 368, 9)}`;
    case 'point-right':
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [483, 274], [538, 305]], 'open', true)}`;
    case 'sad':
      return `${arm([[198, 268], [164, 372], [170, 474]], 'fist')}${arm([[402, 268], [439, 374], [430, 474]], 'fist', true)}`;
    case 'surprised':
      return `${arm([leftShoulder, [184, 210], [218, 164]], 'open')}${arm([rightShoulder, [416, 210], [382, 164]], 'open', true)}`;
    case 'think':
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [390, 235], [340, 198]], 'fist', true)}`;
    case 'thumbs-up':
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [456, 300], [486, 232]], 'thumb', true)}`;
    case 'warning':
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [455, 244], [498, 218]], 'open', true)}`;
    case 'whispering':
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [400, 220], [366, 178]], 'open', true)}`;
    case 'idle':
    default:
      return `${arm([leftShoulder, [162, 318], [184, 385]])}${clipboard(170, 345)}${arm([rightShoulder, [424, 337], [398, 420]], 'fist', true)}`;
  }
}

function poseExtras(pose) {
  const marks = {
    celebrate: `<path d="M 120 88 L 92 56 M 472 84 L 506 52" stroke="${colors.gold}" stroke-width="10" stroke-linecap="round"/>`,
    excited: `<path d="M 104 178 L 70 152 M 497 178 L 530 152" stroke="${colors.cyan}" stroke-width="8" stroke-linecap="round"/>`,
    warning: `<path d="M 505 174 L 526 143 M 523 205 L 560 194" stroke="${colors.gold}" stroke-width="7" stroke-linecap="round"/>`,
    surprised: `<path d="M 144 128 L 112 96 M 455 128 L 488 96" stroke="${colors.cyan}" stroke-width="8" stroke-linecap="round"/>`,
  };
  return marks[pose] ?? '';
}

function svgForPose(pose, variant) {
  const spec = variant === 'inline' ? INLINE : FULL;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="${spec.viewBox}">
  <g transform="${pose === 'sad' ? 'translate(0 10)' : ''}">
    ${baseBody(pose)}
    ${armLayer(pose)}
    ${poseExtras(pose)}
  </g>
</svg>`;
}

async function renderSvg(page, svg, outPath, spec) {
  await page.setViewportSize({ width: spec.width, height: spec.height });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.locator('svg').screenshot({
    path: outPath,
    omitBackground: true,
    animations: 'disabled',
  });
}

async function dataUrl(filePath) {
  const data = await readFile(filePath);
  return `data:image/png;base64,${data.toString('base64')}`;
}

async function renderContactSheet(page, outPath) {
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
            min-height: 112px;
            border: 2px solid #244457;
            background: #0b1520;
            padding: 10px;
          }
          .pose-label { color: #42d9e8; font-size: 17px; }
          .cell {
            height: 110px;
            display: grid;
            place-items: center;
            background: #101c28;
            border: 1px solid #31516a;
          }
          .cell.full img { height: 104px; width: auto; }
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

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  try {
    for (const [pose, fileName] of POSES) {
      await renderSvg(page, svgForPose(pose, 'full'), resolve(CHIP_DIR, fileName), FULL);
      await renderSvg(page, svgForPose(pose, 'inline'), resolve(INLINE_DIR, fileName), INLINE);
    }
    if (CONTACT_SHEET) {
      await mkdir(resolve(CONTACT_SHEET, '..'), { recursive: true });
      await renderContactSheet(page, CONTACT_SHEET);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
