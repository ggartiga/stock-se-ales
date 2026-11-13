/** Marca de STOCK SEÑALES: semáforo estilizado (diseño original). */
export function Logo({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#f25c0f" />
      <rect x="21" y="9" width="22" height="38" rx="11" fill="#fff" />
      <circle cx="32" cy="20" r="5" fill="#f25c0f" />
      <circle cx="32" cy="36" r="5" fill="#1d2125" />
      <rect x="29" y="47" width="6" height="9" fill="#fff" />
      <rect x="20" y="54" width="24" height="4" rx="2" fill="#fff" />
    </svg>
  );
}

export function MarcaTexto({ subtitulo = true }: { subtitulo?: boolean }) {
  return (
    <span className="flex flex-col leading-none">
      <span className="text-lg font-black tracking-tight text-tinta">
        STOCK <span className="text-marca-500">SEÑALES</span>
      </span>
      {subtitulo && <span className="mt-0.5 text-xs font-medium text-tinta-suave">Inventario área de Señales</span>}
    </span>
  );
}
