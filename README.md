# Sample Snack app

Open the `App.js` file to start writing some code. You can preview the changes directly on your phone or tablet by scanning the **QR code** or use the iOS or Android emulators. When you're done, click **Save** and share the link!

When you're ready to see everything that Expo provides (or if you want to use your own editor) you can **Download** your project and use it with [expo cli](https://docs.expo.dev/get-started/installation/#expo-cli)).

All projects created in Snack are publicly available, so you can easily share the link to this project via link, or embed it on a web page with the `<>` button.

If you're having problems, you can tweet to us [@expo](https://twitter.com/expo) or ask in our [forums](https://forums.expo.dev/c/expo-dev-tools/61) or [Discord](https://chat.expo.dev/).

Snack is Open Source. You can find the code on the [GitHub repo](https://github.com/expo/snack).

# FoodConect

## Configurar Supabase

1. Crie um projeto em [Supabase](https://supabase.com) e copie a URL e a chave anon/public.
2. Crie o arquivo `.env` na raiz a partir de `.env.example`:

```powershell
Copy-Item .env.example .env
```

Preencha `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Essas são as únicas variáveis permitidas no app; nunca coloque `SERVICE_ROLE_KEY` ou token de pagamento no Expo.

3. Instale e autentique o CLI, vinculando o projeto:

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

O `SEU_PROJECT_REF` está na URL do projeto, entre `https://` e `.supabase.co`.

## Pagamento Mercado Pago

O carrinho chama a Edge Function `create-payment`, que cria o pedido e retorna o checkout hospedado pelo Mercado Pago. Configure o token privado no Supabase:

```powershell
npx supabase secrets set MP_ACCESS_TOKEN=SEU_ACCESS_TOKEN
npx supabase functions deploy create-payment
```

Para testar localmente, use `npx supabase start` e configure os secrets no ambiente local. No painel do Mercado Pago, crie um access token de teste antes de usar credenciais de produção.

O schema de pedidos está em `supabase/migrations`. Antes de produção, a Edge Function deve consultar os preços oficiais dos produtos no banco, em vez de confiar nos preços enviados pelo dispositivo.

## Executar

```powershell
npm install
npx expo start
```


npx supabase login
npx supabase link --project-ref qhssnuzrvmrsnuzuiwdz
npx supabase functions deploy create-payment
npx supabase functions deploy mp-webhook --no-verify-jwt
mkdir supabase\functions\mp-webhook
New-Item supabase\functions\mp-webhook\index.ts
code supabase\functions\mp-webhook\index.ts