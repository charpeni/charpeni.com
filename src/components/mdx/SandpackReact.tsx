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

type Props = Pick<
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
 */
export default function SandpackReact({
  files,
  template = 'vanilla-ts',
  showPreview = true,
  showLineNumbers = true,
  height = 400,
  options,
  customSetup,
}: Props) {
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
    <div className="sandpackContainer">
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
    </div>
  );
}
