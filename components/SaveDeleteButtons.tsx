import React from 'react';
import { Loader2 } from 'lucide-react';

interface SaveDeleteButtonsProps {
  onDelete: () => void;
  loading: boolean;
}

export default function SaveDeleteButtons({ onDelete, loading }: SaveDeleteButtonsProps) {
  return (
    <div className="flex justify-between mt-8">
      <button
        type="button"
        onClick={onDelete}
        disabled={loading}
        className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Excluir
      </button>
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-royal-blue text-white rounded-xl hover:bg-royal-blue/90 disabled:opacity-50 flex items-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Atualizar paciente
      </button>
    </div>
  );
}
