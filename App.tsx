
import React, { useState, useCallback } from 'react';
import { extractExpressionFromImage, calculateExpression } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import { Spinner } from './components/Spinner';
import { UploadIcon, CalculatorIcon, ErrorIcon, ResultIcon, EquationIcon, CameraIcon } from './components/Icons';

type ProcessState = 'idle' | 'processing' | 'success' | 'error';

export default function App() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [expression, setExpression] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processState, setProcessState] = useState<ProcessState>('idle');

  const resetState = () => {
    setImagePreview(null);
    setExpression(null);
    setResult(null);
    setError(null);
    setProcessState('idle');
    // Also reset the file input visually
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    const cameraInput = document.getElementById('camera-upload') as HTMLInputElement;
    if (cameraInput) {
      cameraInput.value = '';
    }
  };

  const handleImageChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setProcessState('processing');
    setError(null);
    setExpression(null);
    setResult(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const { base64, mimeType } = await fileToBase64(file);

      const extractedExpr = await extractExpressionFromImage(base64, mimeType);
      if (extractedExpr.startsWith("ERROR:")) {
        throw new Error(extractedExpr);
      }
      setExpression(extractedExpr);

      const calculatedResult = await calculateExpression(extractedExpr);
      if (calculatedResult.startsWith("ERROR:")) {
        throw new Error(calculatedResult);
      }
      setResult(calculatedResult);

      setProcessState('success');
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      setProcessState('error');
    }
  }, []);

  const getBackgroundColor = () => {
    switch (processState) {
      case 'processing': return 'bg-blue-50';
      case 'success': return 'bg-green-50';
      case 'error': return 'bg-red-50';
      default: return 'bg-white';
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex justify-center items-center gap-4">
            <CalculatorIcon className="h-10 w-10 text-slate-700" />
            <h1 className="text-4xl font-bold text-slate-800">Snap & Solve</h1>
          </div>
          <p className="text-slate-600 mt-2">Upload an image of a math problem and let AI do the rest!</p>
        </header>

        <main className={`rounded-xl shadow-lg p-6 sm:p-8 transition-colors duration-500 ${getBackgroundColor()}`}>
          {!imagePreview ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
              <UploadIcon className="h-12 w-12 text-slate-400 mb-4" />
              <h2 className="text-xl font-semibold text-slate-700">Upload or Capture an Image</h2>
              <p className="text-slate-500 mt-1">Provide an image of the math problem.</p>
              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform hover:scale-105">
                  <UploadIcon className="h-5 w-5 mr-2 -ml-1" />
                  Select a File
                </label>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={handleImageChange} />

                <label htmlFor="camera-upload" className="cursor-pointer inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-transform hover:scale-105">
                  <CameraIcon className="h-5 w-5 mr-2 -ml-1" />
                  Take a Photo
                </label>
                <input id="camera-upload" name="camera-upload" type="file" className="sr-only" accept="image/*" capture="environment" onChange={handleImageChange} />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Your Image</h3>
                <img src={imagePreview} alt="Math problem preview" className="rounded-lg shadow-md max-h-60 w-auto mx-auto border border-slate-200" />
              </div>

              <div className="relative pt-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
              </div>

              {processState === 'processing' && (
                <div className="flex flex-col items-center justify-center text-center p-4">
                  <Spinner />
                  <p className="text-lg font-medium text-blue-700 mt-4">Kaif's AI is calculating...</p>
                  <p className="text-slate-500">Extracting expression and solving.</p>
                </div>
              )}

              {processState === 'error' && error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                  <div className="flex items-center">
                    <ErrorIcon className="h-6 w-6 mr-3" />
                    <div>
                      <p className="font-bold">Error</p>
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {(processState === 'success' || (processState === 'error' && expression)) && (
                <div className="space-y-4">
                  {expression && (
                    <textarea
                      value={expression}
                      onChange={(e) => setExpression(e.target.value)}
                      className="w-full border rounded p-2 font-mono"
                    />
                  )}

                  {expression && (
                    <div className="p-4 bg-slate-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <EquationIcon className="h-6 w-6 text-slate-500" />
                        <div>
                          <h4 className="font-semibold text-slate-700">Extracted Expression</h4>
                          <p className="text-xl font-mono text-slate-900 bg-white px-2 py-1 rounded">{expression}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {result && (
                    <div className="p-4 bg-green-100 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <ResultIcon className="h-6 w-6 text-green-600" />
                        <div>
                          <h4 className="font-bold text-green-800">Final Result</h4>
                          <p className="text-3xl font-bold text-green-700">{result}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-center pt-4">
                <button
                  onClick={resetState}
                  className="px-8 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform hover:scale-105"
                >
                  Calculate Another
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}