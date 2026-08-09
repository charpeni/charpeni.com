import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from '@codesandbox/sandpack-react';
import { useEffect, useState } from 'react';

import type { ComponentPropsWithoutRef } from 'react';

const readerDark = () =>
  typeof document !== 'undefined' &&
  document.documentElement.dataset.reader === 'true' &&
  document.documentElement.classList.contains('dark');

export type SandpackEditorProps = Pick<
  ComponentPropsWithoutRef<typeof SandpackProvider>,
  'files' | 'template' | 'options' | 'customSetup'
> & {
  showPreview?: boolean;
  showLineNumbers?: boolean;
  height?: number | string;
};

/**
 * Port of components/Sandpack.tsx. Theme: next-themes is gone — reader dark
 * mode is the `dark` class on <html> (terminal mode is always cream/light).
 *
 * Split out of SandpackReact so the CodeMirror bundle lands in its own chunk
 * that only loads once the embed is near the viewport — see SandpackReact.
 */
export default function SandpackEditor({
  files,
  template = 'vanilla-ts',
  showPreview = true,
  showLineNumbers = true,
  height = 400,
  options,
  customSetup,
}: SandpackEditorProps) {
  const [isDark, setIsDark] = useState(readerDark);
  useEffect(() => {
    // Re-theme live when the reader dark-mode toggle flips the `dark` class
    // (parity with the old next-themes-driven re-render).
    const observer = new MutationObserver(() => setIsDark(readerDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-reader'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <SandpackProvider
      template={template}
      files={files}
      customSetup={customSetup}
      theme={isDark ? 'dark' : 'light'}
      options={options}
    >
      <SandpackLayout>
        <SandpackCodeEditor
          style={{ flex: 2, height }}
          initMode="immediate"
          showLineNumbers={showLineNumbers}
          showInlineErrors
        />
        {showPreview ? <SandpackPreview style={{ height }} /> : null}
      </SandpackLayout>
    </SandpackProvider>
  );
}
