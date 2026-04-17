/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/dashboard", destination: "/dashboard.html" },
    ];
  },
};

export default nextConfig;
