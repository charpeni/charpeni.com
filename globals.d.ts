// Ambient declarations for side-effect imports of stylesheets that ship with
// third-party packages. TypeScript 6.0 reports TS2882 for side-effect imports
// whose module specifier resolves to an untyped `.css` file via the package's
// `exports` map (e.g. `import 'rehype-callouts/theme/obsidian'`), so we declare
// the affected specifiers as empty modules here.
declare module '*.css';
declare module 'rehype-callouts/theme/*';
