import React from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        onFileUpload(file);
      } else {
        alert('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      }
    }
  };

  return (
    <div className="bg-zinc-900 p-8 rounded-3xl border-2 border-dashed border-zinc-700 hover:border-indigo-500 transition-colors">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center">
          <FileSpreadsheet size={40} className="text-indigo-500" />
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-bold mb-2">Upload do Ficheiro Excel</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Arraste o ficheiro ou clique para selecionar
          </p>
        </div>

        <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 px-8 py-4 rounded-xl font-bold uppercase text-xs flex items-center gap-2 transition-colors">
          <Upload size={18} />
          Selecionar Ficheiro
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        <p className="text-xs text-zinc-500 text-center max-w-md">
          O ficheiro deve conter as abas: "Tabela Telecom", "Tabela REP e Stock" e "Tabela Posto Trabalho"
        </p>
      </div>
    </div>
  );
};

export default FileUploader;