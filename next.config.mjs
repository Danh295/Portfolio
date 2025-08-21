/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
    assetPrefix: '/Portfolio/',
    basePath: '/Portfolio', 
};

export default nextConfig;
