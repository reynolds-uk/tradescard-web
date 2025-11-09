/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      // Retire the old launcher and send anyone hitting /checkout to /join
      {
        source: "/checkout",
        destination: "/join",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;