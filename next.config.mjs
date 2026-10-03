const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: isProd ? "/Portfolio" : "",
  // Memoizes components and hooks at build time, so a state change in App (e.g. each
  // keystroke in the embedded shell) only re-renders the parts whose props changed. The
  // code already follows its rules (eslint-config-next's react-hooks compiler rules).
  reactCompiler: true,
};

export default nextConfig;
