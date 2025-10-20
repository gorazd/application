console.log("Loading MATTER.JS");

import Matter from 'matter-js';

const {
	Engine,
	Render,
	Runner,
	Common,
	Body,
	MouseConstraint,
	Mouse,
	Composite,
	Bodies,
	Events,
} = Matter;

const keywords = [
	'Front-end Design',
	'Creative Coding',
	'Experience Design',
	'Design Systems',
	'Eleventy & Jamstack',
	'Accessibility',
	'Motion Graphics',
	'UX Writing',
	'Rapid Prototyping',
	'Web Performance',
	'Brand Storytelling',
	'TypeScript',
	'Interface Design',
];

const parseCssColor = (value) => {
	if (!value) {
		return null;
	}

	const color = value.trim();

	if (!color) {
		return null;
	}

	const hexMatch = color.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);

	if (hexMatch) {
		let hex = hexMatch[1];

		if (hex.length === 3 || hex.length === 4) {
			hex = hex
				.split('')
				.map((char) => char + char)
				.join('');
		}

		const intVal = Number.parseInt(hex.slice(0, 6), 16);

		if (Number.isNaN(intVal)) {
			return null;
		}

		return {
			r: (intVal >> 16) & 255,
			g: (intVal >> 8) & 255,
			b: intVal & 255,
		};
	}

	const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/i);

	if (rgbMatch) {
		const parts = rgbMatch[1]
			.split(',')
			.map((part) => Number.parseFloat(part.trim()))
			.slice(0, 3);

		if (parts.every((component) => Number.isFinite(component))) {
			return {
				r: Math.max(0, Math.min(255, parts[0])),
				g: Math.max(0, Math.min(255, parts[1])),
				b: Math.max(0, Math.min(255, parts[2])),
			};
		}
	}

	return null;
};

const toLinear = (channel) => {
	const value = channel / 255;

	return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
};

const relativeLuminance = ({ r, g, b }) => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

const contrastRatio = (colorA, colorB) => {
	const rgbA = parseCssColor(colorA);
	const rgbB = parseCssColor(colorB);

	if (!rgbA || !rgbB) {
		return 0;
	}

	const luminanceA = relativeLuminance(rgbA);
	const luminanceB = relativeLuminance(rgbB);

	const brightest = Math.max(luminanceA, luminanceB);
	const darkest = Math.min(luminanceA, luminanceB);

	return (brightest + 0.05) / (darkest + 0.05);
};

const invertCssColor = (value) => {
	const rgb = parseCssColor(value);

	if (!rgb) {
		return '#ffffff';
	}

	const inverted = {
		r: 255 - Math.round(rgb.r),
		g: 255 - Math.round(rgb.g),
		b: 255 - Math.round(rgb.b),
	};

	return `rgb(${inverted.r}, ${inverted.g}, ${inverted.b})`;
};

const pickReadableTextColor = (backgroundColor, themeData) => {
	const candidates = [
		themeData.textColor,
		themeData.inverseTextColor,
		'#111111',
		'#fefefe',
	];

	let bestColor = candidates[0];
	let bestContrast = 0;

	candidates.forEach((candidate) => {
		const ratio = contrastRatio(backgroundColor, candidate);

		if (ratio >= bestContrast) {
			bestContrast = ratio;
			bestColor = candidate;
		}
	});

	return bestColor;
};

const readTheme = () => {
	const rootStyles = getComputedStyle(document.documentElement);
	const bodyStyles = getComputedStyle(document.body);

	const paletteVariables = [
		'--background-bright-color',
		'--link-hover-bg',
		'--background-color',
		'--link-color',
		'--border-color',
	];

	const pillPalette = paletteVariables
		.map((name) => rootStyles.getPropertyValue(name).trim())
		.filter(Boolean);

	const textColor = rootStyles.getPropertyValue('--text-color').trim() || '#333333';
	const inverseTextColor = invertCssColor(textColor);

	const fontFamilyFromVars =
		rootStyles.getPropertyValue('--font-sans').trim() ||
		rootStyles.getPropertyValue('--font-body').trim();

	const fontFamily = fontFamilyFromVars || bodyStyles.fontFamily || "'PPSupplySans','Arial Adjusted',Arial,sans-serif";
	const baseFontSize = Number.parseFloat(bodyStyles.fontSize) || 18;
	const fontSize = Math.min(Math.max(baseFontSize * 1.2, 16), 28);
	const strokeColor = rootStyles.getPropertyValue('--border-color').trim() || 'rgba(0,0,0,0.1)';

	return {
		pillPalette: pillPalette.length ? pillPalette : ['#fefefe', '#93eca8', '#0055cc', '#e3e5e2'],
		textColor,
		inverseTextColor,
		fontFamily,
		fontSize,
		fontWeight: 400,
		strokeColor,
	};
};

class KeywordMatterScene {
	constructor(container) {
		this.container = container;
		this.containerStyleSnapshot = null;

		if (this.container) {
			this.containerStyleSnapshot = this.captureContainerStyles();
			this.applyFullWindowLayout();
		}
		this.engine = Engine.create();
		this.runner = Runner.create();
		this.world = this.engine.world;
		this.dimensions = this.computeDimensions();
		this.pixelRatio = this.computePixelRatio();
		this.theme = readTheme();

		this.render = Render.create({
			element: this.container,
			engine: this.engine,
			options: {
				width: this.dimensions.width,
				height: this.dimensions.height,
				pixelRatio: this.pixelRatio,
				wireframes: false,
				background: 'transparent',
				showInternalEdges: false,
			},
		});

		this.syncRenderGeometry();

		this.wallOptions = {
			isStatic: true,
			render: {
				fillStyle: 'transparent',
			},
		};

		this.keywordBodies = [];
		this.staticWalls = [];
		this.resizeObserver = null;
		this.windowResizeListener = null;
		this.resizeRaf = null;
		this.themeObserver = null;
		this.removeColorSchemeListener = null;

		this.afterRenderHandler = () => {
			this.drawKeywordText();
		};

		this.initializeWorld();
		this.observeTheme();
		this.observeResize();
	}

	computeDimensions() {
		if (typeof window === 'undefined') {
			return { width: 800, height: 600 };
		}

		const viewportWidth = Math.max(
			Number.isFinite(window.innerWidth) ? window.innerWidth : 0,
			document.documentElement?.clientWidth ?? 0,
			240
		);
		const viewportHeight = Math.max(
			Number.isFinite(window.innerHeight) ? window.innerHeight : 0,
			document.documentElement?.clientHeight ?? 0,
			260
		);

		return { width: Math.round(viewportWidth), height: Math.round(viewportHeight) };
	}

	computePixelRatio() {
		if (typeof window === 'undefined') {
			return 1;
		}

		const ratio = window.devicePixelRatio || 1;
		return Math.min(Math.max(ratio, 1), 3);
	}

	captureContainerStyles() {
		if (!this.container) {
			return null;
		}

		return {
			position: this.container.style.position,
			top: this.container.style.top,
			right: this.container.style.right,
			bottom: this.container.style.bottom,
			left: this.container.style.left,
			width: this.container.style.width,
			height: this.container.style.height,
			maxWidth: this.container.style.maxWidth,
			maxHeight: this.container.style.maxHeight,
			pointerEvents: this.container.style.pointerEvents,
			overflow: this.container.style.overflow,
			zIndex: this.container.style.zIndex,
		};
	}

	applyFullWindowLayout() {
		if (!this.container) {
			return;
		}

		const style = this.container.style;
		style.position = 'fixed';
		style.top = '0';
		style.right = '0';
		style.bottom = '0';
		style.left = '0';
		style.width = '100vw';
		style.height = '100vh';
		style.maxWidth = 'none';
		style.maxHeight = 'none';
		style.pointerEvents = 'none';
		style.overflow = 'hidden';
		style.zIndex = style.zIndex || '-1';
	}

	restoreContainerLayout() {
		if (!this.container || !this.containerStyleSnapshot) {
			return;
		}

		const target = this.containerStyleSnapshot;
		this.container.style.position = target.position;
		this.container.style.top = target.top;
		this.container.style.right = target.right;
		this.container.style.bottom = target.bottom;
		this.container.style.left = target.left;
		this.container.style.width = target.width;
		this.container.style.height = target.height;
		this.container.style.maxWidth = target.maxWidth;
		this.container.style.maxHeight = target.maxHeight;
		this.container.style.pointerEvents = target.pointerEvents;
		this.container.style.overflow = target.overflow;
		this.container.style.zIndex = target.zIndex;
	}

	syncRenderGeometry() {
		if (!this.render) {
			return;
		}

		const { width, height } = this.dimensions;

		if (this.render.options) {
			this.render.options.width = width;
			this.render.options.height = height;
			this.render.options.pixelRatio = this.pixelRatio;
		}

		if (this.render.canvas) {
			const canvas = this.render.canvas;
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;

			if (typeof Render.setPixelRatio === 'function') {
				Render.setPixelRatio(this.render, this.pixelRatio);
			} else {
				const scaledWidth = Math.round(width * this.pixelRatio);
				const scaledHeight = Math.round(height * this.pixelRatio);

				if (canvas.width !== scaledWidth) {
					canvas.width = scaledWidth;
				}
				if (canvas.height !== scaledHeight) {
					canvas.height = scaledHeight;
				}
			}
		}

		if (this.render.context) {
			this.render.context.imageSmoothingEnabled = true;
			if (typeof this.render.context.imageSmoothingQuality === 'string') {
				this.render.context.imageSmoothingQuality = 'high';
			}
		}

		if (this.mouse) {
			this.mouse.pixelRatio = this.pixelRatio;
		}
	}

	buildStaticWalls() {
		const { width, height } = this.dimensions;
		const offset = 10;
		const thickness = 50.5;

		return [
			Bodies.rectangle(width / 2, -height - offset * 4, width + 2 * offset, thickness, this.wallOptions),
			Bodies.rectangle(width / 2, height + offset, width + 2 * offset, thickness, this.wallOptions),
			Bodies.rectangle(width + offset, height / 2, thickness, height + 2 * offset, this.wallOptions),
			Bodies.rectangle(-offset, height / 2, thickness, height + 2 * offset, this.wallOptions),
		];
	}

	createKeywordBody(text, index) {
		const { width } = this.dimensions;
		const pillHeight = Math.max(this.theme.fontSize * 1.7, 48);
		const horizontalPadding = Math.min(width * 0.12, 160);
		const maxUsableWidth = Math.max(width - horizontalPadding * 2, 160);
		const estimatedWidth = this.theme.fontSize * 0.62 * text.length + pillHeight;
		const pillWidth = Math.min(Math.max(140, estimatedWidth), maxUsableWidth);
		const minX = horizontalPadding + pillWidth / 2;
		const maxX = width - horizontalPadding - pillWidth / 2;
		const spawnX = minX < maxX ? Common.random(minX, maxX) : width / 2;
		const verticalSpacing = pillHeight + 24;
		const spawnY = Math.min(-pillHeight * 0.75, -((index + 1) * verticalSpacing * 0.6));

		const body = Bodies.rectangle(spawnX, spawnY, pillWidth, pillHeight, {
			chamfer: { radius: pillHeight / 2 },
			angle: Common.random(-0.18, 0.18),
			restitution: 0.45,
			friction: 0.28,
			frictionStatic: 0.9,
			frictionAir: 0.025,
			density: 0.0018,
		});

		body.plugin = body.plugin || {};
		body.plugin.keyword = {
			text,
			width: pillWidth,
			height: pillHeight,
		};

		return body;
	}

	initializeWorld() {
		this.staticWalls = this.buildStaticWalls();
		Composite.add(this.world, this.staticWalls);

		this.keywordBodies = keywords.map((text, index) => this.createKeywordBody(text, index));
		Composite.add(this.world, this.keywordBodies);

		this.mouse = Mouse.create(this.render.canvas);
		this.mouseConstraint = MouseConstraint.create(this.engine, {
			mouse: this.mouse,
			constraint: {
				stiffness: 0.2,
				render: {
					visible: false,
				},
			},
		});
		Composite.add(this.world, this.mouseConstraint);

		this.render.mouse = this.mouse;

		Events.on(this.render, 'afterRender', this.afterRenderHandler);

		this.applyThemeToBodies();

		Render.run(this.render);
		Runner.run(this.runner, this.engine);
	}

	applyThemeToBodies() {
		if (!this.keywordBodies?.length) {
			return;
		}

		this.keywordBodies.forEach((body, index) => {
			const fillColor = this.theme.pillPalette[index % this.theme.pillPalette.length];
			body.render.fillStyle = fillColor;
			body.render.strokeStyle = this.theme.strokeColor;
			body.render.lineWidth = 2;
			body.plugin = body.plugin || {};
			body.plugin.keyword = {
				...body.plugin.keyword,
				textColor: pickReadableTextColor(fillColor, this.theme),
				fontFamily: this.theme.fontFamily,
				fontSize: this.theme.fontSize,
				fontWeight: this.theme.fontWeight,
			};
		});
	}

	drawKeywordText() {
		const context = this.render?.context;

		if (!context) {
			return;
		}

		context.save();
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.shadowColor = 'transparent';

		this.keywordBodies.forEach((body) => {
			const keyword = body.plugin?.keyword;

			if (!keyword) {
				return;
			}

			context.save();
			context.translate(body.position.x, body.position.y);
			context.rotate(body.angle);
			context.fillStyle = keyword.textColor;
			context.font = `${keyword.fontWeight} ${keyword.fontSize}px ${keyword.fontFamily}`;
			context.fillText(keyword.text, 0, 0);
			context.restore();
		});

		context.restore();
	}

	handleThemeChange() {
		this.theme = readTheme();
		this.applyThemeToBodies();
	}

	observeTheme() {
		if (typeof MutationObserver !== 'undefined') {
			this.themeObserver = new MutationObserver(() => this.handleThemeChange());
			this.themeObserver.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['class'],
			});
		}

		if (typeof window.matchMedia === 'function') {
			const media = window.matchMedia('(prefers-color-scheme: dark)');

			if (media) {
				const handler = () => this.handleThemeChange();

				if (typeof media.addEventListener === 'function') {
					media.addEventListener('change', handler);
					this.removeColorSchemeListener = () => media.removeEventListener('change', handler);
				} else if (typeof media.addListener === 'function') {
					media.addListener(handler);
					this.removeColorSchemeListener = () => media.removeListener(handler);
				}
			}
		}
	}

	observeResize() {
		if (typeof ResizeObserver !== 'undefined' && this.container) {
			this.resizeObserver = new ResizeObserver(() => this.handleResize());
			this.resizeObserver.observe(this.container);
			return;
		}

		this.windowResizeListener = () => {
			if (this.resizeRaf) {
				cancelAnimationFrame(this.resizeRaf);
			}

			this.resizeRaf = requestAnimationFrame(() => {
				this.resizeRaf = null;
				this.handleResize();
			});
		};

		window.addEventListener('resize', this.windowResizeListener, { passive: true });
	}

	handleResize() {
		const previousDimensions = this.dimensions;
		const nextDimensions = this.computeDimensions();
		const nextPixelRatio = this.computePixelRatio();

		if (
			Math.abs(nextDimensions.width - this.dimensions.width) < 1 &&
			Math.abs(nextDimensions.height - this.dimensions.height) < 1 &&
			Math.abs(nextPixelRatio - this.pixelRatio) < 0.01
		) {
			return;
		}

		const wasRunning = this.render?.frameRequestId != null;

		this.dimensions = nextDimensions;
		this.pixelRatio = nextPixelRatio;

		if (this.container) {
			this.container.style.width = '100vw';
			this.container.style.height = '100vh';
		}

		this.syncRenderGeometry();

		if (this.staticWalls?.length) {
			this.staticWalls.forEach((wall) => Composite.remove(this.world, wall));
		}
		this.staticWalls = this.buildStaticWalls();
		Composite.add(this.world, this.staticWalls);

		if (this.keywordBodies?.length) {
			const previousWidth = previousDimensions?.width || nextDimensions.width;
			const previousHeight = previousDimensions?.height || nextDimensions.height;
			const widthRatio = previousWidth ? nextDimensions.width / previousWidth : 1;
			const heightRatio = previousHeight ? nextDimensions.height / previousHeight : 1;
			const horizontalPadding = Math.max(nextDimensions.width * 0.02, 36);
			const verticalPadding = Math.max(nextDimensions.height * 0.02, 48);

			this.keywordBodies.forEach((body) => {
				const scaledX = body.position.x * widthRatio;
				const scaledY = body.position.y * heightRatio;
				Body.setPosition(body, { x: scaledX, y: scaledY });

				const halfWidth = (body.bounds.max.x - body.bounds.min.x) / 2;
				const halfHeight = (body.bounds.max.y - body.bounds.min.y) / 2;

				const minX = halfWidth + horizontalPadding;
				const maxX = Math.max(minX, this.dimensions.width - halfWidth - horizontalPadding);
				const minY = halfHeight + verticalPadding;
				const maxY = Math.max(minY, this.dimensions.height - halfHeight - verticalPadding);

				let targetX = scaledX;
				let targetY = scaledY;

				if (maxX > minX) {
					targetX = Math.min(Math.max(scaledX, minX), maxX);
				} else {
					targetX = this.dimensions.width / 2;
				}

				if (maxY > minY) {
					targetY = Math.min(Math.max(scaledY, minY), maxY);
				} else {
					targetY = this.dimensions.height / 2;
				}

				if (targetX !== scaledX || targetY !== scaledY) {
					Body.setPosition(body, { x: targetX, y: targetY });
				}
			});
		}

		this.applyThemeToBodies();

		if (!wasRunning && this.render && this.render.frameRequestId == null) {
			Render.run(this.render);
		}
	}

	destroy() {
		this.restoreContainerLayout();

		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}

		if (this.windowResizeListener) {
			window.removeEventListener('resize', this.windowResizeListener);
			this.windowResizeListener = null;
		}

		if (this.resizeRaf) {
			cancelAnimationFrame(this.resizeRaf);
			this.resizeRaf = null;
		}

		if (this.themeObserver) {
			this.themeObserver.disconnect();
			this.themeObserver = null;
		}

		if (this.removeColorSchemeListener) {
			this.removeColorSchemeListener();
			this.removeColorSchemeListener = null;
		}

		if (this.render) {
			Events.off(this.render, 'afterRender', this.afterRenderHandler);
		}

		if (this.mouseConstraint) {
			Composite.remove(this.world, this.mouseConstraint);
		}

		if (this.staticWalls?.length) {
			this.staticWalls.forEach((wall) => Composite.remove(this.world, wall));
			this.staticWalls = [];
		}

		if (this.keywordBodies?.length) {
			this.keywordBodies.forEach((body) => Composite.remove(this.world, body));
			this.keywordBodies = [];
		}

		Render.stop(this.render);
		Runner.stop(this.runner);
		Composite.clear(this.world, false);
		Engine.clear(this.engine);

		if (this.render?.canvas && this.render.canvas.parentNode === this.render.element) {
			this.render.element.removeChild(this.render.canvas);
		}

		this.render = null;
		this.engine = null;
		this.runner = null;
		this.mouse = null;
		this.mouseConstraint = null;
		this.containerStyleSnapshot = null;
	}
}

let currentScene = null;

const destroyMatterScene = () => {
	if (currentScene) {
		currentScene.destroy();
		currentScene = null;
	}
};

const initMatterScene = () => {
	if (typeof document === 'undefined') {
		return;
	}

	const container = document.getElementById('matter-root');

	if (!container) {
		destroyMatterScene();
		return;
	}

	if (currentScene && currentScene.container === container) {
		return;
	}

	destroyMatterScene();
	currentScene = new KeywordMatterScene(container);
};

if (typeof window !== 'undefined') {
	window.__initMatterScene = initMatterScene;
	window.__destroyMatterScene = destroyMatterScene;

	window.addEventListener('spa:page-leave', destroyMatterScene);
	window.addEventListener('spa:page-enter', () => {
		requestAnimationFrame(() => initMatterScene());
	});
	window.addEventListener('beforeunload', destroyMatterScene);

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initMatterScene, { once: true });
	} else {
		initMatterScene();
	}
}
