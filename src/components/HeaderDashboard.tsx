import HeaderDashboard from "@/components/HeaderDashboard"

export default function Dashboard() {
  // ... seus estados e lógicas

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* 👇 Olha como o código da tela fica limpo! 👇 */}
      <HeaderDashboard />
      
      {/* Aqui continua o resto da sua tela de gestão de projetos (cards, tabelas, etc) */}
      <main className="p-8">
         <h1 className="text-2xl font-bold">Meus Projetos</h1>
         {/* ... */}
      </main>

    </div>
  );
}