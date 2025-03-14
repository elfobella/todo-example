"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import TodoItem from "./TodoItem";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";

interface Todo {
  id: string;
  task: string;
  is_complete: boolean;
  user_id: string;
  created_at: string;
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const { user } = useAuth();
  
  // Input referansı
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Abonelik ve fetch durumlarını takip etmek için ref'ler
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const isFetchingRef = useRef(false);
  const isComponentMountedRef = useRef(true);

  // Todo'ları getirme fonksiyonu
  const fetchTodos = useCallback(async () => {
    // Eğer kullanıcı yoksa veya zaten veri çekiyorsak işlem yapma
    if (!user?.id || isFetchingRef.current || !isComponentMountedRef.current) return;
    
    isFetchingRef.current = true;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Bileşen hala mount edilmişse state'i güncelle
      if (isComponentMountedRef.current) {
        setTodos(data || []);
      }
    } catch (error: Error | unknown) {
      if (isComponentMountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : "Görevler yüklenirken bir hata oluştu.";
        toast.error(errorMessage);
      }
    } finally {
      if (isComponentMountedRef.current) {
        setIsLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [user?.id]);

  // Gerçek zamanlı abonelik kurma
  const setupRealtimeSubscription = useCallback(() => {
    if (!user?.id || !isComponentMountedRef.current) return;
    
    // Önceki aboneliği temizle
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    // Benzersiz bir kanal adı oluştur
    const channelName = `todos_changes_${user.id}_${Date.now()}`;
    
    // Yeni abonelik oluştur
    const subscription = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "todos",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (!isComponentMountedRef.current) return;
          
          // Yeni eklenen todo'yu state'e ekle
          const newTodo = payload.new as Todo;
          setTodos((currentTodos) => {
            // Eğer todo zaten varsa ekleme
            if (currentTodos.some(todo => todo.id === newTodo.id)) {
              return currentTodos;
            }
            return [newTodo, ...currentTodos];
          });
          toast.success("Yeni görev eklendi!");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "todos",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (!isComponentMountedRef.current) return;
          
          // Güncellenen todo'yu state'de güncelle
          const updatedTodo = payload.new as Todo;
          setTodos((currentTodos) =>
            currentTodos.map((todo) =>
              todo.id === updatedTodo.id ? updatedTodo : todo
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "todos",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (!isComponentMountedRef.current) return;
          
          // Silinen todo'yu state'den kaldır
          const deletedTodoId = payload.old.id;
          setTodos((currentTodos) =>
            currentTodos.filter((todo) => todo.id !== deletedTodoId)
          );
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED' && isComponentMountedRef.current) {
          console.error('Supabase realtime subscription failed:', status);
          // Abonelik başarısız olursa, 5 saniye sonra tekrar dene
          setTimeout(() => {
            if (isComponentMountedRef.current) {
              setupRealtimeSubscription();
            }
          }, 5000);
        }
      });
    
    // Aboneliği ref'e kaydet
    subscriptionRef.current = subscription;
  }, [user?.id]);

  // Kullanıcı değiştiğinde todo'ları getir ve gerçek zamanlı aboneliği kur
  useEffect(() => {
    // Bileşen mount edildiğinde flag'i true yap
    isComponentMountedRef.current = true;
    
    if (user?.id) {
      fetchTodos();
      setupRealtimeSubscription();
    } else {
      // Kullanıcı yoksa todo'ları temizle
      setTodos([]);
      setIsLoading(false);
    }
    
    // Cleanup fonksiyonu
    return () => {
      // Bileşen unmount edildiğinde flag'i false yap
      isComponentMountedRef.current = false;
      
      // Aboneliği temizle
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [user?.id, fetchTodos, setupRealtimeSubscription]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !user?.id || isAddingTodo) return;

    // Yükleme durumunu başlat
    setIsAddingTodo(true);

    // Geçici bir ID oluştur
    const tempId = crypto.randomUUID();
    
    // Optimistik UI güncellemesi - Sunucu yanıtını beklemeden önce UI'da göster
    const newTodoItem: Todo = {
      id: tempId,
      task: newTask,
      is_complete: false,
      user_id: user.id,
      created_at: new Date().toISOString(),
    };
    
    // Geçici todo'yu state'e ekle
    setTodos((currentTodos) => [newTodoItem, ...currentTodos]);
    
    // Input'u temizle
    const taskToAdd = newTask;
    setNewTask("");

    try {
      const { error } = await supabase.from("todos").insert([
        {
          task: taskToAdd,
          is_complete: false,
          user_id: user.id,
        },
      ]).select();

      if (error) throw error;
      
      // Gerçek zamanlı abonelik zaten yeni todo'yu ekleyecek,
      // bu nedenle burada bir şey yapmamıza gerek yok
      toast.success("Görev başarıyla eklendi!");
    } catch (error: Error | unknown) {
      // Hata durumunda geçici todo'yu kaldır
      setTodos((currentTodos) => currentTodos.filter(todo => todo.id !== tempId));
      setNewTask(taskToAdd); // Input'a eski değeri geri koy
      const errorMessage = error instanceof Error ? error.message : "Görev eklenirken bir hata oluştu.";
      toast.error(errorMessage);
    } finally {
      setIsAddingTodo(false);
      // İşlem tamamlandıktan sonra input'a focus ol
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
      
      // Optimistik UI güncellemesi
      setTodos(todos.filter((todo) => todo.id !== id));
      toast.success("Görev başarıyla silindi!");
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : "Görev silinirken bir hata oluştu.";
      toast.error(errorMessage);
    }
  };

  const updateTodo = async (id: string, is_complete: boolean) => {
    try {
      // Optimistik UI güncellemesi
      setTodos(
        todos.map((todo) =>
          todo.id === id ? { ...todo, is_complete } : todo
        )
      );
      
      const { error } = await supabase
        .from("todos")
        .update({ is_complete })
        .eq("id", id);

      if (error) throw error;
      toast.success("Görev başarıyla güncellendi!");
    } catch (error: Error | unknown) {
      // Hata durumunda UI'ı eski haline getir
      setTodos(
        todos.map((todo) =>
          todo.id === id ? { ...todo, is_complete: !is_complete } : todo
        )
      );
      const errorMessage = error instanceof Error ? error.message : "Görev güncellenirken bir hata oluştu.";
      toast.error(errorMessage);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Başarıyla çıkış yapıldı!");
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : "Çıkış yapılırken bir hata oluştu.";
      toast.error(errorMessage);
    }
  };

  // Tarih formatlamak için yardımcı fonksiyon
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Kullanıcının baş harflerini alma
  const getUserInitials = (user: { user_metadata?: { name?: string }, email?: string } | null) => {
    if (!user) return '?';
    
    if (user.user_metadata?.name) {
      return user.user_metadata.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    
    return 'U';
  };

  // Todo eklendikten sonra input'a focus olmak için effect
  useEffect(() => {
    if (!isAddingTodo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingTodo]);

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-full py-8 space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-center max-w-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium">Görevlerinizi görmek için giriş yapmalısınız.</p>
          <p className="text-sm mt-1">Giriş yaptıktan sonra görevlerinizi ekleyebilir, düzenleyebilir ve takip edebilirsiniz.</p>
        </div>
        <Link href="/auth">
          <Button>Giriş Yap / Kayıt Ol</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Kullanıcı Profil Kartı */}
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-3 text-sm font-medium">
                {getUserInitials(user)}
              </div>
              <div>
                <CardTitle className="text-lg">{user.user_metadata?.name || user.email || 'Kullanıcı'}</CardTitle>
                <CardDescription className="text-xs mt-1">
                  {user.email && user.user_metadata?.name ? user.email : ''}
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Çıkış Yap
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
            <div>Son giriş:</div>
            <div>{formatDate(user.last_sign_in_at) || 'Bilinmiyor'}</div>
            <div>Kullanıcı ID:</div>
            <div className="truncate" title={user.id}>{user.id.substring(0, 8)}...</div>
          </div>
        </CardContent>
      </Card>

      {/* Todo Kartı */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Görevlerim</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addTodo} className="flex gap-2 mb-4">
            <Input
              ref={inputRef}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Yeni görev ekle..."
              required
              disabled={isAddingTodo}
              className={isAddingTodo ? "opacity-70" : ""}
            />
            <Button 
              type="submit" 
              disabled={isAddingTodo || !newTask.trim()}
              className={`min-w-[80px] ${isAddingTodo ? "opacity-70" : ""}`}
            >
              {isAddingTodo ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                "Ekle"
              )}
            </Button>
          </form>

          {isLoading ? (
            <div className="text-center py-4">
              <svg className="animate-spin h-8 w-8 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-2">Görevler yükleniyor...</p>
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              Henüz görev eklenmemiş.
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {todos.map((todo) => (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TodoItem
                      id={todo.id}
                      task={todo.task}
                      is_complete={todo.is_complete}
                      onDelete={deleteTodo}
                      onUpdate={updateTodo}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 