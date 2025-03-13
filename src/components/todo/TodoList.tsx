"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import TodoItem from "./TodoItem";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const fetchTodos = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("todos")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTodos(data || []);
      } catch (error: any) {
        toast.error(error.message || "Görevler yüklenirken bir hata oluştu.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodos();

    // Gerçek zamanlı güncellemeler için abonelik
    const subscription = supabase
      .channel("todos_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "todos",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTodos();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !user) return;

    try {
      const { error } = await supabase.from("todos").insert([
        {
          task: newTask,
          is_complete: false,
          user_id: user.id,
        },
      ]);

      if (error) throw error;
      setNewTask("");
      toast.success("Görev başarıyla eklendi!");
    } catch (error: any) {
      toast.error(error.message || "Görev eklenirken bir hata oluştu.");
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
      setTodos(todos.filter((todo) => todo.id !== id));
      toast.success("Görev başarıyla silindi!");
    } catch (error: any) {
      toast.error(error.message || "Görev silinirken bir hata oluştu.");
    }
  };

  const updateTodo = async (id: string, is_complete: boolean) => {
    try {
      const { error } = await supabase
        .from("todos")
        .update({ is_complete })
        .eq("id", id);

      if (error) throw error;
      setTodos(
        todos.map((todo) =>
          todo.id === id ? { ...todo, is_complete } : todo
        )
      );
      toast.success("Görev başarıyla güncellendi!");
    } catch (error: any) {
      toast.error(error.message || "Görev güncellenirken bir hata oluştu.");
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Başarıyla çıkış yapıldı!");
    } catch (error: any) {
      toast.error(error.message || "Çıkış yapılırken bir hata oluştu.");
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Lütfen giriş yapın.</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Görevlerim</CardTitle>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Çıkış Yap
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={addTodo} className="flex gap-2 mb-4">
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Yeni görev ekle..."
            required
          />
          <Button type="submit">Ekle</Button>
        </form>

        {isLoading ? (
          <div className="text-center py-4">Yükleniyor...</div>
        ) : todos.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            Henüz görev eklenmemiş.
          </div>
        ) : (
          <div className="space-y-2">
            {todos.map((todo) => (
              <TodoItem
                key={todo.id}
                id={todo.id}
                task={todo.task}
                is_complete={todo.is_complete}
                onDelete={deleteTodo}
                onUpdate={updateTodo}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 