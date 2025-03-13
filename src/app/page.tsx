import TodoList from "@/components/todo/TodoList";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">Todo Uygulaması</h1>
        <TodoList />
        <div className="mt-4 text-center">
          <Link href="/auth">
            <Button variant="outline">Giriş Yap / Kayıt Ol</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
