import { transpileCssToJs, transpileCssInitial } from './compile-css-to-js.js';
import { patchMediaQueries } from '../src/tailwind/core.js';
import { mkdir, writeFile } from 'fs/promises';
import plugin from 'tailwindcss/plugin.js';

const INTELLISENSE_FILE_NAME = 'generated-classes.js';
const GENERATED_DIR_PATH = `./src/tailwind/generated`;

async function writeStaticFile() {
	const generatedComponentJSS = await transpileCssToJs('./src/styles/components.css');
	const componentClasses = patchMediaQueries(generatedComponentJSS);

	const componentPlugin = plugin(({ addComponents }) => {
		addComponents(componentClasses);
	});
	const baseStyles = await transpileCssToJs('./src/styles/base.css', [componentPlugin]);

	// Creates the generated CSS-in-JS file
	await writeFile(
		`${GENERATED_DIR_PATH}/${INTELLISENSE_FILE_NAME}`,
		`module.exports = { components: ${JSON.stringify(componentClasses)}, base: ${JSON.stringify(baseStyles)} };`
	).catch((e) => console.error(e));
}

async function writeInitialFile() {
	const components = await transpileCssInitial('./src/styles/components.css');
	const base = await transpileCssInitial('./src/styles/base.css');

	await writeFile(
		`${GENERATED_DIR_PATH}/generated-initial.js`,
		`module.exports = { components: ${JSON.stringify(components)}, base: ${JSON.stringify(base)} };`
	).catch((e) => console.error(e));
}

async function exec() {
	// Makes directory that stores our generated CSS-in-JS
	await mkdir(GENERATED_DIR_PATH).catch(() => {
		// directory already exists
	});

	await writeStaticFile();
	await writeInitialFile();
}

exec();
