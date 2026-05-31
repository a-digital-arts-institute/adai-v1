import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outRoot = path.join(repoRoot, 'exports', 'brand-logos');
const svgDir = path.join(outRoot, 'svg');
const pngDir = path.join(outRoot, 'png');
const renderDir = path.join(outRoot, '_render');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const googleFontHref = 'https://fonts.googleapis.com/css2?family=Courier+Prime:wght@300;400;500;700&display=swap';

function loadBrandSystem() {
  const source = awaitableRead(path.join(repoRoot, 'public/field/adai-system.js'));
  const context = {
    window: {},
    document: {
      readyState: 'complete',
      addEventListener() {},
      getElementById() { return null; },
      documentElement: { style: { setProperty() {} } },
      body: null,
    },
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
  };
  vm.runInNewContext(source, context, { filename: 'adai-system.js' });
  return context.window.ADAI_SYSTEM.BRAND;
}

function awaitableRead(filePath) {
  return execFileSync(process.execPath, [
    '-e',
    `process.stdout.write(require('fs').readFileSync(${JSON.stringify(filePath)}, 'utf8'))`,
  ], { encoding: 'utf8' });
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'logo';
}

function svgForAsset(asset, color) {
  const { width, height, variant, type } = asset;
  const fill = color.hex;
  const fontFamily = 'Courier Prime, Courier New, monospace';

  if (type === 'lockup') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      @import url('${googleFontHref}');
      .mono { font-family: ${fontFamily}; font-size: 430px; font-weight: ${variant.weight}; letter-spacing: ${variant.tracking}; fill: ${fill}; }
      .word { font-family: ${fontFamily}; font-size: 118px; font-weight: 300; letter-spacing: 0.16em; fill: ${fill}; }
    </style>
  </defs>
  <text class="mono" x="${width / 2}" y="585" text-anchor="middle">${escapeXml(variant.text)}</text>
  <text class="word" x="${width / 2}" y="820" text-anchor="middle">a digital arts institute</text>
</svg>
`;
  }

  if (type === 'wordmark') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      @import url('${googleFontHref}');
      text { font-family: ${fontFamily}; font-size: 240px; font-weight: 300; letter-spacing: 0.16em; fill: ${fill}; }
    </style>
  </defs>
  <text x="${width / 2}" y="540" text-anchor="middle">a digital arts institute</text>
</svg>
`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      @import url('${googleFontHref}');
      text { font-family: ${fontFamily}; font-size: 520px; font-weight: ${variant.weight}; letter-spacing: ${variant.tracking}; fill: ${fill}; }
    </style>
  </defs>
  <text x="${width / 2}" y="650" text-anchor="middle">${escapeXml(variant.text)}</text>
</svg>
`;
}

function htmlForAsset(asset, color) {
  const { width, height, variant, type } = asset;
  const family = "'Courier Prime', 'Courier New', monospace";
  const text = variant?.text || '';

  const inner = type === 'lockup'
    ? `<div class="lockup"><div class="mono">${escapeXml(text)}</div><div class="word">a digital arts institute</div></div>`
    : type === 'wordmark'
      ? `<div class="word standalone">a digital arts institute</div>`
      : `<div class="mono">${escapeXml(text)}</div>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${googleFontHref}" rel="stylesheet">
  <style>
    html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: transparent; }
    body { display: flex; align-items: center; justify-content: center; color: ${color.hex}; }
    .stage { width: ${width}px; height: ${height}px; display: flex; align-items: center; justify-content: center; box-sizing: border-box; padding: ${Math.round(width * 0.075)}px; }
    .mono { font-family: ${family}; font-size: ${type === 'lockup' ? 430 : 520}px; font-weight: ${variant?.weight || 400}; letter-spacing: ${variant?.tracking || '0.08em'}; line-height: 1; white-space: nowrap; }
    .word { font-family: ${family}; font-size: ${type === 'lockup' ? 118 : 240}px; font-weight: 300; letter-spacing: 0.16em; line-height: 1; white-space: nowrap; }
    .standalone { text-align: center; }
    .lockup { display: inline-flex; flex-direction: column; align-items: center; gap: 92px; transform-origin: center center; }
  </style>
</head>
<body>
  <div class="stage">${inner}</div>
  <script>
    (async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const stage = document.querySelector('.stage');
      const target = document.querySelector('.lockup') || document.querySelector('.mono') || document.querySelector('.word');
      const maxW = stage.clientWidth;
      const maxH = stage.clientHeight;
      if (target.classList.contains('lockup')) {
        const scale = Math.min(1, maxW / target.scrollWidth, maxH / target.scrollHeight);
        target.style.transform = 'scale(' + scale + ')';
      } else {
        let size = parseFloat(getComputedStyle(target).fontSize);
        for (let i = 0; i < 120 && (target.scrollWidth > maxW || target.scrollHeight > maxH); i++) {
          size *= 0.96;
          target.style.fontSize = size + 'px';
        }
      }
      document.body.dataset.ready = 'true';
    })();
  </script>
</body>
</html>
`;
}

function renderPng(htmlPath, pngPath, width, height) {
  execFileSync(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--default-background-color=00000000',
    '--virtual-time-budget=3000',
    `--window-size=${width},${height}`,
    `--screenshot=${pngPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: 'pipe' });
}

function readPngSignature(bytes) {
  return bytes.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
}

async function main() {
  const brand = loadBrandSystem();
  const primaryFont = brand.FONTS[0];
  const variants = brand.LOGO_VARIANTS;
  const colors = [
    { key: 'light', label: 'Light', hex: '#F2F2F2' },
    { key: 'ink', label: 'Ink', hex: '#0C0C0E' },
  ];

  await fs.rm(outRoot, { recursive: true, force: true });
  await fs.mkdir(svgDir, { recursive: true });
  await fs.mkdir(pngDir, { recursive: true });
  await fs.mkdir(renderDir, { recursive: true });

  const assets = [
    ...variants.map((variant, index) => ({
      type: 'monogram',
      name: `${String(index + 1).padStart(2, '0')}-${slug(variant.text)}`,
      label: variant.text,
      variant,
      width: 4096,
      height: 1024,
    })),
    {
      type: 'wordmark',
      name: 'wordmark-a-digital-arts-institute',
      label: 'a digital arts institute',
      variant: variants[0],
      width: 4096,
      height: 1024,
    },
    {
      type: 'lockup',
      name: 'primary-lockup-a-dai-wordmark',
      label: `${variants[0].text} + a digital arts institute`,
      variant: variants[0],
      width: 4096,
      height: 1536,
    },
  ];

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'public/field/brand.html via public/field/adai-system.js',
    font: primaryFont.name,
    colors,
    assets: [],
  };

  for (const asset of assets) {
    for (const color of colors) {
      const base = `${asset.name}-${color.key}`;
      const svgPath = path.join(svgDir, `${base}.svg`);
      const htmlPath = path.join(renderDir, `${base}.html`);
      const pngPath = path.join(pngDir, `${base}-${asset.width}x${asset.height}.png`);

      await fs.writeFile(svgPath, svgForAsset(asset, color), 'utf8');
      await fs.writeFile(htmlPath, htmlForAsset(asset, color), 'utf8');
      renderPng(htmlPath, pngPath, asset.width, asset.height);

      const pngBytes = await fs.readFile(pngPath);
      if (!readPngSignature(pngBytes)) throw new Error(`Chrome did not produce a PNG: ${pngPath}`);

      manifest.assets.push({
        label: asset.label,
        type: asset.type,
        color: color.label,
        svg: path.relative(outRoot, svgPath),
        png: path.relative(outRoot, pngPath),
        dimensions: `${asset.width}x${asset.height}`,
      });
    }
  }

  await fs.writeFile(path.join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  await fs.writeFile(path.join(outRoot, 'README.md'), `# A(DAI) Brand Logo Exports

Generated from the brand definitions used by \`public/field/brand.html\`.

- Font: ${primaryFont.name}
- SVG files: \`svg/\`
- Transparent PNG files: \`png/\`
- Colors: light \`#F2F2F2\` and ink \`#0C0C0E\`
- Monogram PNGs: 4096 x 1024
- Wordmark PNGs: 4096 x 1024
- Primary lockup PNGs: 4096 x 1536

The SVGs are vector source files. The PNGs are rendered through headless Chrome so the web font styling matches the brand page.
`, 'utf8');

  console.log(`Exported ${manifest.assets.length} logo files to ${outRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
