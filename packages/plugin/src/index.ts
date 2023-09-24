import plugin from 'tailwindcss/plugin.js';
import postcssJs from 'postcss-js';
import { coreConfig, coreUtilities, getSkeletonClasses, processInitialCss } from './tailwind/core.js';
import { themes, getThemeProperties } from './tailwind/themes/index.js';
import { prefixSelector } from './tailwind/prefixSelector.js';
import type { CSSRuleObject } from 'tailwindcss/types/config.js';
import type { ConfigOptions, CustomThemeConfig, PresetThemeConfig, ThemeConfig } from './types.js';
import type { SkeletonClasses } from './tailwind/core.js';
import assert from 'assert';

const skeleton = plugin.withOptions<ConfigOptions>(
	// Plugin Creator
	(options) => {
		return ({ addBase, addComponents, addUtilities, config }) => {
			const handler = ({ components, base }: SkeletonClasses) => {
				assert(base);
				assert(components);

				let baseStyles: CSSRuleObject = {};
				let componentStyles = components;

				// Base styles configuration
				if (options?.base !== false) {
					addBase(base);
				}

				// Custom Themes configuration
				options?.themes?.custom?.forEach((theme) => {
					// it's a custom theme
					baseStyles[`:root [data-theme='${theme.name}']`] = theme.properties;
					if (theme.properties_dark) {
						baseStyles[`.dark [data-theme='${theme.name}']`] = theme.properties_dark;
					}
				});

				// Preset Themes configuration
				options?.themes?.preset?.forEach((theme) => {
					// it's a preset theme but just the name was passed in
					if (typeof theme === 'string') {
						const themeName = theme;
						// we only want the properties
						baseStyles[`:root [data-theme='${themeName}']`] = themes[themeName].properties;
						baseStyles[`.dark [data-theme='${themeName}']`] = themes[themeName].properties_dark;
						return;
					}

					// it's a preset theme
					if (!('properties' in theme)) {
						baseStyles[`:root [data-theme='${theme.name}']`] = themes[theme.name].properties;
						baseStyles[`.dark [data-theme='${theme.name}']`] = themes[theme.name].properties_dark;

						if (theme.enhancements === true) {
							// enhancements are opt-in
							baseStyles = { ...baseStyles, ...themes[theme.name].enhancements };
						}
						return;
					}
				});

				// Prefix component classes
				if (options?.prefix) {
					const prefix = options?.prefix;
					const root = postcssJs.parse(components);
					root.walkRules((rule) => {
						rule.selector = prefixSelector(prefix, rule.selector);
					});

					componentStyles = postcssJs.objectify(root);
				}

				addBase(baseStyles);
				addUtilities(coreUtilities);
				addComponents(componentStyles, { respectPrefix: false });
			};
			if (options?.dynamic) {
				processInitialCss(config('theme')).then(handler);
			} else {
				handler(getSkeletonClasses());
			}
		};
	},
	// Config
	() => {
		return { ...coreConfig };
	}
);

export { getThemeProperties, skeleton };
export type { CustomThemeConfig, ConfigOptions, PresetThemeConfig, ThemeConfig };
