'use client';

import type { ComponentPropsWithoutRef } from 'react';

import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
} from '@codesandbox/sandpack-react';
import { useTheme } from 'next-themes';

import styles from './Sandpack.module.css';

type Props = Pick<
  ComponentPropsWithoutRef<typeof SandpackProvider>,
  'files' | 'template' | 'options' | 'customSetup'
> & {
  showPreview?: boolean;
  showLineNumbers?: boolean;
  height?: number | string;
};

export default function Sandpack({
  files,
  template = 'vanilla-ts',
  showPreview = true,
  showLineNumbers = true,
  height = 400,
  options,
  customSetup,
}: Props) {
  const { resolvedTheme } = useTheme();
  const sandpackTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <div className={styles.sandpackContainer}>
      <SandpackProvider
        template={template}
        files={files}
        customSetup={customSetup}
        theme={sandpackTheme}
        options={options}
      >
        <SandpackLayout>
          <SandpackCodeEditor
            style={{ flex: 2, height }}
            initMode="immediate" // Required to avoid a flicker when switching tabs
            showLineNumbers={showLineNumbers}
            showInlineErrors
          />
          {showPreview ? <SandpackPreview style={{ height }} /> : null}
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
