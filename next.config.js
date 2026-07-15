const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  images: {
    qualities: [100, 75],
  },
  outputFileTracingIncludes: {
    '/api/blog-mdx/*': [
      './node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/*.d.ts',
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/blog/enforce-best-practices-incrementally',
        destination: '/blog/enforce-best-practices-incrementally-with-betterer',
        permanent: true,
      },
      // The blog post list lives on the homepage; /blog is not its own page.
      // Redirect to avoid a 404 for inbound links and external references.
      {
        source: '/blog',
        destination: '/',
        permanent: true,
      },
    ];
  },
});

// https://securityheaders.com
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' api.pirsch.io va.vercel-scripts.com giscus.app https://*.codesandbox.io;
  child-src *.google.com *.codesandbox.io;
  style-src 'self' 'unsafe-inline' *.googleapis.com giscus.app https://*.codesandbox.io;
  img-src * blob: data:;
  media-src 'none';
  connect-src *;
  font-src 'self' https://*.codesandbox.io;
  frame-src https://giscus.app/ https://*.codesandbox.io;
`;

const securityHeaders = [
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\n/g, ''),
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy
  // Opt-out of Google FLoC: https://amifloced.org/
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];
