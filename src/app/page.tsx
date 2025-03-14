"use client";

import { useEffect, useState, useCallback } from "react";
import TodoList from "@/components/todo/TodoList";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user, isLoading, refreshSession } = useAuth();
  const [hasInitialized, setHasInitialized] = useState(false);

  // Oturum durumunu yenileme işlemini memoize et
  const initializeAuth = useCallback(async () => {
    if (hasInitialized) return;
    
    try {
      await refreshSession();
    } catch (error) {
      console.error("Oturum durumu yenilenirken hata oluştu:", error);
    } finally {
      setHasInitialized(true);
    }
  }, [refreshSession, hasInitialized]);

  // Sayfa yüklendiğinde oturum durumunu yenile, ancak sadece bir kez
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">Todo Uygulaması</h1>
        <TodoList />
        
        {/* Giriş Yap / Kayıt Ol butonu sadece kullanıcı giriş yapmamışsa gösterilir */}
        {!user && !isLoading && hasInitialized && (
          <div className="mt-4 text-center">
            <Link href="/auth">
              <Button variant="outline">Giriş Yap / Kayıt Ol</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
