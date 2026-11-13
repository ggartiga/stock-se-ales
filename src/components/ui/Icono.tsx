import {
  Boxes,
  ChartColumn,
  ClipboardList,
  History,
  LayoutGrid,
  PackagePlus,
  QrCode,
  ScanLine,
  SlidersHorizontal,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { OpcionMenu } from "@/lib/navegacion";

const MAPA: Record<OpcionMenu["icono"], LucideIcon> = {
  inventario: Boxes,
  escanear: ScanLine,
  historial: History,
  mas: LayoutGrid,
  ingreso: PackagePlus,
  ajuste: SlidersHorizontal,
  productos: ClipboardList,
  almacenes: Warehouse,
  usuarios: Users,
  qr: QrCode,
  reportes: ChartColumn,
};

export function IconoOpcion({ nombre, className = "size-5" }: { nombre: OpcionMenu["icono"]; className?: string }) {
  const Componente = MAPA[nombre];
  return <Componente className={className} aria-hidden="true" />;
}
