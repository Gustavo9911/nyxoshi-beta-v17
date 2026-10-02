import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
}
