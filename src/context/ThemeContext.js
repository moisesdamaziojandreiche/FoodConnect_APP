import React, {
  createContext,
  useState,
} from "react";

export const ThemeContext =
  createContext();

export function ThemeProvider({
  children,
}) {
  const [temaEscuro, setTemaEscuro] =
    useState(false);

  const cores = temaEscuro
  ? {
      fundo: "#121212",
      texto: "#FFFFFF",
      card: "#1E1E1E",
      secundario: "#BBBBBB",
      principal: "#FF6B00",
      favorito: "#FFFFFF",
      comida: "#FF6B00",
    }
  : {
      fundo: "#FFFFFF",
      texto: "#1E1E1E",
      card: "#F8F8F8",
      secundario: "#666666",
      principal: "#FF6B00",
      favorito: "#1E1E1E",
      comida: "#FF8C00",
    };

  return (
    <ThemeContext.Provider
      value={{
        temaEscuro,
        setTemaEscuro,
        cores,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}