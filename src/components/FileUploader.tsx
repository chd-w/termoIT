import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  acceptedTypes: string;
  label: string;
  icon?: React.ReactNode;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onFileSelect, 
  acceptedTypes, 
  label,
  icon 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={handleClick}
        className="w-full p-6 border-2 border-dashed border-zinc-700 rounded-xl hover:border-indigo-500 hover:bg-zinc-800/50 transition-all flex flex-col items-center justify-center gap-3 group"
      >
        <div className="text-zinc-400 group-hover:text-indigo-400 transition-colors">
          {icon || <Upload className="w-8 h-8" />}
        </div>
        <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">
          {label}
        </span>
        <span className="text-xs text-zinc-500">
          {acceptedTypes.split(',').join(', ')}
        </span>
      </button>
    </div>
  );
};

export default FileUploader;