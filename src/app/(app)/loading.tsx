/** Esqueleto de carga mientras el servidor consulta la base de datos. */
export default function Cargando() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-gray-200" />
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-tarjeta bg-gray-200" />
        ))}
      </div>
      <div className="h-28 animate-pulse rounded-tarjeta bg-gray-200" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-tarjeta bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
