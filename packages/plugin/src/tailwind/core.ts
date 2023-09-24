/* eslint-disable @typescript-eslint/no-var-requires */
// The Skeleton Tailwind Plugin
// Tailwind Docs: https://tailwindcss.com/docs/plugins
// Skeleton Docs: https://www.skeleton.dev/docs/get-started

import plugin from 'tailwindcss/plugin.js';

// Skeleton Theme Modules
import themeColors from './colors.js';
// Skeleton Design Token Modules
import tokensBackgrounds from './tokens/backgrounds.js';
import tokensBorders from './tokens/borders.js';
import tokensBorderRadius from './tokens/border-radius.js';
import tokensFills from './tokens/fills.js';
import tokensText from './tokens/text.js';
import tokensRings from './tokens/rings.js';

import postcss, { type PluginCreator } from 'postcss';
import postcssJs from 'postcss-js';
import postcssImport from 'postcss-import';

import tw from 'tailwindcss';

import type { Config } from 'tailwindcss';
import { CssInJs } from 'postcss-js';

const tailwindcss = tw as unknown as PluginCreator<string | Config | { config: string | Config }>;

export const coreUtilities = {
	// Implement Skeleton design token classes
	...tokensBackgrounds(),
	...tokensBorders(),
	...tokensBorderRadius(),
	...tokensFills(),
	...tokensText(),
	...tokensRings()
};

export const coreConfig = {
	theme: {
		extend: {
			// Implement Skeleton theme colors
			colors: themeColors()
		}
	}
};

// export const coreClasses = getSkeletonClasses();

export interface SkeletonClasses {
	components?: CssInJs;
	base?: CssInJs;
}

export function getSkeletonClasses(): SkeletonClasses {
	// try/catch because it will throw when generated-classes.js isn't generated yet
	try {
		const { components, base } = require('./generated/generated-classes.js');

		if (typeof components !== 'object' || typeof base !== 'object') {
			console.error('Failed to load Skeleton classes');
			process.exitCode = 1;
		}

		return { components, base };
	} catch {
		console.error("generated-classes.js hasn't generated yet");
	}

	return { components: undefined, base: undefined };
}

function getInitialCss() {
	try {
		const { components, base } = require('./generated/generated-initial.js');

		if (typeof components !== 'object' || typeof base !== 'object') {
			console.error('Failed to load Skeleton classes');
			process.exitCode = 1;
		}

		return { components, base };
	} catch {
		console.error("generated-initial.js hasn't generated yet");
	}

	return { components: undefined, base: undefined };
}

async function transpileFromInitialCss(css: string, cssInJs: CssInJs, plugins: Config['plugins'] = [], theme?: Config['theme']) {
	const selectors: string[] = [];

	const root = postcssJs.parse(cssInJs);
	root.walk((node) => {
		if (node.type === 'rule') {
			selectors.push(...node.selectors);
		}
	});

	const twConfig = {
		darkMode: 'class',
		content: [{ raw: selectors.join(' ') }],
		theme,
		plugins: [
			corePlugin,
			// add skeleton component classes for the base styles
			...plugins
		]
	} satisfies Config;

	const result = await postcss([postcssImport(), tailwindcss(twConfig)]).process(css, {});
	if (result.root.type === 'document') throw Error('This should never happen');

	return postcssJs.objectify(result.root);
}

export async function processInitialCss(theme?: Config['theme']): Promise<SkeletonClasses> {
	const { components, base } = getInitialCss();

	let componentsJSS = await transpileFromInitialCss(components.css, components.cssInJs, [], theme);
	componentsJSS = patchMediaQueries(componentsJSS);

	const componentsPlugin = plugin(({ addComponents }) => {
		addComponents(componentsJSS);
	});
	const baseJSS = await transpileFromInitialCss(base.css, base.cssInJs, [componentsPlugin], theme);

	return { components: componentsJSS, base: baseJSS };
}

export const corePlugin = plugin(({ addUtilities }) => {
	addUtilities(coreUtilities);
}, coreConfig);

// Moves all of the media queries towards the end of the cssInJs object.
export function patchMediaQueries(cssInJs: CssInJs): CssInJs {
	const mediaQueries: CssInJs = {};

	for (const key of Object.keys(cssInJs)) {
		if (key.startsWith('@media')) {
			mediaQueries[key] = cssInJs[key];
			delete cssInJs[key];
		}
	}

	for (const key of Object.keys(mediaQueries)) {
		cssInJs[key] = mediaQueries[key];
	}

	return cssInJs;
}
