import { format } from 'date-fns';

export function formatDisplayDate(date: Date | number | string, pattern = 'dd MMM yyyy') {
  return format(new Date(date), pattern);
}
