"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "./supabase";
import { User, Session } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  refreshSession: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // useCallback ile refreshSession fonksiyonunu memoize ediyoruz
  const refreshSession = useCallback(async () => {
    // Eğer zaten yükleme yapılıyorsa ve ilk kez değilse, tekrar yapmayalım
    if (isLoading && isInitialized) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      
      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      } else {
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      console.error("Oturum bilgileri alınamadı:", error);
      setSession(null);
      setUser(null);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [isLoading, isInitialized]);

  // İlk yükleme ve oturum değişikliklerini dinleme
  useEffect(() => {
    let isMounted = true;
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    
    const initializeAuth = async () => {
      if (!isMounted) return;
      
      try {
        // Mevcut oturumu al
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (isMounted) {
          if (data?.session) {
            setSession(data.session);
            setUser(data.session.user);
          } else {
            setSession(null);
            setUser(null);
          }
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Oturum bilgileri alınamadı:", error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setIsInitialized(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
      
      // Oturum durumu değişikliklerini dinle
      if (isMounted) {
        const { data } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!isMounted) return;
            
            console.log("Auth state changed:", event);
            
            // Sadece oturum durumu değiştiğinde state'i güncelle
            const sessionChanged = 
              (newSession && !session) || 
              (!newSession && session) || 
              (newSession && session && newSession.access_token !== session.access_token);
              
            if (sessionChanged) {
              setSession(newSession);
              setUser(newSession?.user || null);
            }
            
            setIsLoading(false);
          }
        );
        
        authListener = data;
      }
    };
    
    initializeAuth();

    return () => {
      isMounted = false;
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [session]);

  // Context değerini memoize et
  const contextValue = useMemo(() => ({
    user,
    session,
    isLoading,
    refreshSession,
  }), [user, session, isLoading, refreshSession]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
} 