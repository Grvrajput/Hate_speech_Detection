import React, { useState } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface DropzoneProps extends DropzoneOptions {
  onFileDrop: (file: File) => void;
}

export function Dropzone({ onFileDrop, ...props }: DropzoneProps) {
  const [fileName, setFileName] = useState<string>('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    ...props,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setFileName(file.name);
        onFileDrop(file);
      }
    },
    maxFiles: 1,
    accept: {
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf']
    }
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300 ease-in-out
        ${isDragActive ? 'border-purple-400 bg-purple-100 bg-opacity-20' : 'border-gray-300 hover:border-purple-400'}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <Upload className={`w-16 h-16 ${isDragActive ? 'text-purple-400' : 'text-gray-300'}`} />
        {fileName ? (
          <p className="text-lg text-gray-300">Selected file: {fileName}</p>
        ) : (
          <p className="text-lg text-gray-300">
            Drag and drop your file here or click to browse
          </p>
        )}
        <p className="text-sm text-gray-300">
          Supported formats: TXT, DOC, DOCX, PDF (Max 15MB) <br />
          Max 1 File Allowed
        </p>
      </div>
    </div>
  );
}