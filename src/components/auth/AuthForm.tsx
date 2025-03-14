"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const formSchema = z.object({
  email: z.string().email({ message: "Geçerli bir e-posta adresi girin." }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
});

export default function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { refreshSession } = useAuth();
  const isRedirecting = useRef(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Yönlendirme işlemini bir kez gerçekleştirmek için memoize edilmiş fonksiyon
  const handleRedirect = useCallback(() => {
    if (isRedirecting.current) return;
    isRedirecting.current = true;
    
    // Doğrudan window.location ile yönlendirme yap
    // Bu, Next.js router'ın bazen çalışmama sorununu çözer
    window.location.href = "/";
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isRedirecting.current) {
      // Kısa bir gecikme ekleyerek kullanıcıya geri bildirim sağla
      const timer = setTimeout(handleRedirect, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, handleRedirect]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isLoading || isAuthenticated) return;
    
    setIsLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (error) throw error;
        
        // Oturum durumunu yenile
        await refreshSession();
        
        toast.success("Başarıyla giriş yapıldı! Yönlendiriliyorsunuz...");
        setIsAuthenticated(true);
      } else {
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;
        toast.success("Kayıt başarılı! E-posta adresinizi kontrol edin.");
      }
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : "Bir hata oluştu.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{isLogin ? "Giriş Yap" : "Kayıt Ol"}</CardTitle>
        <CardDescription>
          {isLogin
            ? "Todo uygulamasına giriş yapın."
            : "Yeni bir hesap oluşturun."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAuthenticated ? (
          <div className="text-center py-4">
            <svg className="animate-spin h-8 w-8 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2">Giriş başarılı! Ana sayfaya yönlendiriliyorsunuz...</p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-posta</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ornek@mail.com" 
                        autoComplete="email"
                        type="email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şifre</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="******" 
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || isAuthenticated}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    İşleniyor...
                  </span>
                ) : isLogin ? "Giriş Yap" : "Kayıt Ol"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      {!isAuthenticated && (
        <CardFooter className="flex justify-center">
          <Button
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm"
            disabled={isLoading}
            type="button"
          >
            {isLogin
              ? "Hesabınız yok mu? Kayıt olun"
              : "Zaten hesabınız var mı? Giriş yapın"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 