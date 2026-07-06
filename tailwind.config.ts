import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Identidade visual GTA (extraída dos documentos oficiais)
        gta: {
          navy: "#1A2F4A", // azul-marinho — base, títulos, faixa do cabeçalho
          navy2: "#243555", // navy mais claro — gradiente da faixa
          indigo: "#5B4FCF", // índigo — destaque (aba do logo, ações)
          orange: "#F26522", // laranja — energia, régua/realce
          bg: "#F5F6F8", // cinza claro — fundo das páginas
          border: "#CCCCCC", // bordas das tabelas
          ink: "#243555",
        },
      },
      fontFamily: {
        sans: ["Aptos", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
