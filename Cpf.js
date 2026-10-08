// Mesma regra de public.cpf_valido() do banco (clientes.cpf tem CHECK).
export function somenteDigitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

export function cpfValido(valor) {
  const cpf = somenteDigitos(valor);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(cpf[i]) * (n + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(cpf[n])) return false;
  }

  return true;
}