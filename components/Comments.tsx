import Giscus from '@giscus/react';
import { useTheme } from 'next-themes';

export function Comments({ title }: { title: string }) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex flex-col justify-center max-w-2xl mx-auto mb-4 w-full">
      <Giscus
        id="comments"
        repo="charpeni/charpeni.com"
        repoId="MDEwOlJlcG9zaXRvcnkzNjk2Nzk2MDA="
        category="Comments"
        categoryId="DIC_kwDOFgjc8M4Cg1r7"
        mapping="specific"
        term={title}
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        lang="en"
        loading="lazy"
      />
    </div>
  );
}
