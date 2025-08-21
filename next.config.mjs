/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
    assetPrefix: './',
    basePath: '', // ensure no basePath
};

export default nextConfig;
