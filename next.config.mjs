/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: '/Portfolio',
    assetPrefix: '/Portfolio/',
    trailingSlash: true,
    images: {
        unoptimized: true,
    }
};

export default nextConfig;
