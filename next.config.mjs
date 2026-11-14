export default { distDir: process.env.ORBIT_LOCAL_DIST_DIR || ".next", output: process.env.NEXT_STANDALONE === '1' ? 'standalone' : undefined, poweredByHeader: false };
