# Todo Uygulaması

Next.js ve Supabase ile oluşturulmuş basit bir todo uygulaması. Kullanıcılar kayıt olabilir, giriş yapabilir ve kendi todo listelerini yönetebilirler.

## Özellikler

- Kullanıcı kimlik doğrulama (kayıt olma, giriş yapma, çıkış yapma)
- Todo ekleme, silme ve tamamlandı olarak işaretleme
- Gerçek zamanlı güncellemeler
- Duyarlı tasarım

## Teknolojiler

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.io/) - Backend hizmetleri (kimlik doğrulama, veritabanı)
- [Tailwind CSS](https://tailwindcss.com/) - Stil
- [Shadcn UI](https://ui.shadcn.com/) - UI bileşenleri
- [React Hook Form](https://react-hook-form.com/) - Form yönetimi
- [Zod](https://zod.dev/) - Form doğrulama
- [Sonner](https://sonner.emilkowal.ski/) - Toast bildirimleri

## Kurulum

1. Repoyu klonlayın:
   ```bash
   git clone https://github.com/kullaniciadi/todo-example.git
   cd todo-example
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. `.env.local` dosyasını oluşturun:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Supabase projenizde aşağıdaki tabloyu oluşturun:
   ```sql
   CREATE TABLE todos (
     id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) NOT NULL,
     task TEXT NOT NULL,
     is_complete BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- RLS politikaları
   ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Kullanıcılar kendi todo'larını görebilir"
     ON todos FOR SELECT
     USING (auth.uid() = user_id);
   
   CREATE POLICY "Kullanıcılar kendi todo'larını ekleyebilir"
     ON todos FOR INSERT
     WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "Kullanıcılar kendi todo'larını güncelleyebilir"
     ON todos FOR UPDATE
     USING (auth.uid() = user_id);
   
   CREATE POLICY "Kullanıcılar kendi todo'larını silebilir"
     ON todos FOR DELETE
     USING (auth.uid() = user_id);
   ```

5. Uygulamayı başlatın:
   ```bash
   npm run dev
   ```

6. Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresine gidin.

## Lisans

MIT
