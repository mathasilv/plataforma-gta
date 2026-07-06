/** @type {import('next').NextConfig} */
const nextConfig = {
  // docxtemplater/pizzip precisam ser tratados como externos no servidor
  serverExternalPackages: ["docxtemplater", "pizzip"],
  // Garante que os moldes .docx sejam empacotados na build de produção (Vercel)
  outputFileTracingIncludes: {
    "/api/gerar": ["./src/services/**/*.docx"],
  },
};

export default nextConfig;
