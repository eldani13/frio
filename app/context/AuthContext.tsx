"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";

// Tipado extendido para incluir el código del cliente
interface AuthContextType {
  session: {
    uid: string;
    email: string | null;
    clientId?: string;
    codeCuenta?: string; // <--- Nuevo campo
    role?: string;
  } | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ session: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthContextType["session"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true); // Aseguramos que el estado de carga inicie en true

      if (user) {
        try {
         
          const userDoc = await getDoc(doc(db, "usuarios", user.uid));
          const userData = userDoc.data();
          
          let codeCuenta = undefined;
         
          if (userData?.clientId) {
            const clientDoc = await getDoc(doc(db, "clientes", userData.clientId));
            codeCuenta = clientDoc.data()?.code;
          }

          setSession({
            uid: user.uid,
            email: user.email,
            clientId: userData?.clientId,
            codeCuenta: codeCuenta, // Ya lo tienes disponible en toda la app
            role: userData?.role,
          });
        } catch (error) {
          console.error("Error en el flujo de Auth:", error);
          setSession(null);
        }
      } else {
        setSession(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);