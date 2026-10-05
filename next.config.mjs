const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: isProd ? "/Portfolio" : "",
  // When this build ran, inlined into server and client alike (so they agree): a role is
  // "now" while the build date is inside its dates (src/data/experience.js), and the
  // daily deploy flips it the day after it ends.
  env: { BUILD_DATE: new Date().toISOString() },
  // Memoizes components and hooks at build time, so a state change in App (e.g. each
  // keystroke in the embedded shell) only re-renders the parts whose props changed. The
  // code already follows its rules (eslint-config-next's react-hooks compiler rules).
  reactCompiler: true,
};

export default nextConfig;
