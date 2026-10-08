import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra || {};
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch (e) {
    console.warn("Supabase client creation failed:", e);
    client = null;
  }
} else {
  console.warn(
    "Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY in app.json (expo.extra) or environment. Using stub supabase."
  );
}

const NAO_CONFIGURADO = { message: "Supabase não configurado" };

// Usado só quando as chaves não estão configuradas (as telas checam supabase.from).
const stub = {
  auth: {
    signInWithPassword: async () => ({ data: null, error: NAO_CONFIGURADO }),
    signUp: async () => ({ data: null, error: NAO_CONFIGURADO }),
    resetPasswordForEmail: async () => ({ data: null, error: NAO_CONFIGURADO }),
    signOut: async () => ({ error: null }),
    getUser: async () => ({ data: { user: null }, error: NAO_CONFIGURADO }),
  },
  functions: {
    invoke: async () => ({ data: null, error: NAO_CONFIGURADO }),
  },
};

export const supabase = client || stub;