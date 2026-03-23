import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Copy, Download, Upload, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

/**
 * JsonEditor Component
 * 
 * A feature-rich JSON editor with syntax highlighting, validation, and formatting.
 * Supports both editing and viewing modes with real-time validation.
 * 
 * @param {Object} props
 * @param {Object} props.value - The JSON value to edit/view
 * @param {Function} props.onChange - Callback when value changes (returns parsed object)
 * @param {string} props.label - Label for the editor
 * @param {string} props.placeholder - Placeholder text when empty
 * @param {number} props.height - Height of the editor in pixels
 * @param {boolean} props.readOnly - Whether the editor is read-only
 * @param {boolean} props.compact - Whether to use compact mode (smaller padding)
 * @param {string} props.error - External error message
 * @param {string} props.helpText - Help text to display below the editor
 * @param {boolean} props.showLineNumbers - Whether to show line numbers
 * @param {boolean} props.allowUpload - Whether to allow file upload
 * @param {boolean} props.allowDownload - Whether to allow download
 * @param {boolean} props.allowCopy - Whether to allow copy to clipboard
 * @param {boolean} props.allowFormat - Whether to allow format/pretty-print
 * @param {boolean} props.allowExpand - Whether to allow expand/fullscreen
 * @param {string} props.className - Additional CSS classes
 */
export function JsonEditor({
  value,
  onChange,
  label,
  placeholder = '{}',
  height = 300,
  readOnly = false,
  compact = false,
  error: externalError,
  helpText,
  showLineNumbers = true,
  allowUpload = true,
  allowDownload = true,
  allowCopy = true,
  allowFormat = true,
  allowExpand = true,
  className = '',
}) {
  const [textValue, setTextValue] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [parseError, setParseError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editorHeight, setEditorHeight] = useState(height);
  const [lineCount, setLineCount] = useState(1);

  // Initialize text value from prop
  useEffect(() => {
    try {
      if (value === undefined || value === null) {
        setTextValue('');
      } else if (typeof value === 'string') {
        // If it's already a string, try to parse to validate but store formatted
        try {
          const parsed = JSON.parse(value);
          setTextValue(JSON.stringify(parsed, null, 2));
        } catch {
          setTextValue(value);
        }
      } else {
        setTextValue(JSON.stringify(value, null, 2));
      }
    } catch (err) {
      setTextValue('');
    }
  }, [value]);

  // Count lines for line numbers
  useEffect(() => {
    setLineCount(textValue.split('\n').length);
  }, [textValue]);

  // Validate JSON on change
  const validateJson = useCallback((str) => {
    if (!str.trim()) {
      setIsValid(true);
      setParseError(null);
      return true;
    }
    
    try {
      JSON.parse(str);
      setIsValid(true);
      setParseError(null);
      return true;
    } catch (err) {
      setIsValid(false);
      setParseError(err.message);
      return false;
    }
  }, []);

  // Handle text change
  const handleChange = (e) => {
    const newValue = e.target.value;
    setTextValue(newValue);
    
    const valid = validateJson(newValue);
    
    if (valid && onChange) {
      try {
        const parsed = newValue.trim() ? JSON.parse(newValue) : null;
        onChange(parsed);
      } catch {
        // Don't call onChange if invalid
      }
    }
  };

  // Format JSON (pretty print)
  const handleFormat = () => {
    try {
      if (!textValue.trim()) return;
      
      const parsed = JSON.parse(textValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setTextValue(formatted);
      
      if (onChange) {
        onChange(parsed);
      }
      
      setIsValid(true);
      setParseError(null);
    } catch (err) {
      setParseError('Cannot format invalid JSON');
    }
  };

  // Minify JSON (compact)
  const handleMinify = () => {
    try {
      if (!textValue.trim()) return;
      
      const parsed = JSON.parse(textValue);
      const minified = JSON.stringify(parsed);
      setTextValue(minified);
      
      if (onChange) {
        onChange(parsed);
      }
      
      setIsValid(true);
      setParseError(null);
    } catch (err) {
      setParseError('Cannot minify invalid JSON');
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textValue);
      // You might want to show a toast notification here
      console.log('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Download as file
  const handleDownload = () => {
    try {
      const blob = new Blob([textValue], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = label ? `${label.toLowerCase().replace(/\s+/g, '-')}.json` : 'data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download:', err);
    }
  };

  // Upload from file
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        // Validate it's valid JSON
        JSON.parse(content);
        
        setTextValue(content);
        
        if (onChange) {
          onChange(JSON.parse(content));
        }
        
        setIsValid(true);
        setParseError(null);
      } catch (err) {
        setParseError('File contains invalid JSON');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    e.target.value = '';
  };

  // Toggle expanded view
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    setEditorHeight(isExpanded ? height : window.innerHeight - 200);
  };

  const hasError = !isValid || externalError;
  const errorMessage = parseError || externalError;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label and actions */}
      {(label || allowUpload || allowDownload || allowCopy || allowFormat || allowExpand) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="block text-sm font-medium text-slate-700">
              {label}
            </label>
          )}
          
          <div className="flex items-center gap-1">
            {/* Upload button */}
            {allowUpload && !readOnly && (
              <>
                <input
                  type="file"
                  id="json-upload"
                  accept=".json,application/json"
                  onChange={handleUpload}
                  className="hidden"
                />
                <label
                  htmlFor="json-upload"
                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                  title="Upload JSON file"
                >
                  <Upload className="h-4 w-4" />
                </label>
              </>
            )}

            {/* Download button */}
            {allowDownload && (
              <button
                onClick={handleDownload}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                title="Download as JSON file"
                disabled={!textValue.trim()}
              >
                <Download className="h-4 w-4" />
              </button>
            )}

            {/* Copy button */}
            {allowCopy && (
              <button
                onClick={handleCopy}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                title="Copy to clipboard"
                disabled={!textValue.trim()}
              >
                <Copy className="h-4 w-4" />
              </button>
            )}

            {/* Format button */}
            {allowFormat && !readOnly && (
              <>
                <button
                  onClick={handleFormat}
                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                  title="Format JSON"
                  disabled={!isValid || !textValue.trim()}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h7"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleMinify}
                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                  title="Minify JSON"
                  disabled={!isValid || !textValue.trim()}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8h16M4 16h16"
                    />
                  </svg>
                </button>
              </>
            )}

            {/* Expand button */}
            {allowExpand && (
              <button
                onClick={toggleExpand}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Editor container */}
      <div
        className={`relative rounded-lg border ${
          hasError
            ? 'border-red-300 bg-red-50'
            : isValid
            ? 'border-slate-300 bg-white'
            : 'border-red-300 bg-white'
        }`}
        style={{ height: editorHeight }}
      >
        {/* Line numbers */}
        {showLineNumbers && (
          <div
            className="absolute left-0 top-0 bottom-0 w-12 bg-slate-50 border-r border-slate-200 rounded-l-lg overflow-hidden"
            style={{ userSelect: 'none' }}
          >
            <div className="py-3 px-2 text-right font-mono text-xs text-slate-400">
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i + 1} className="leading-5">
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={textValue}
          onChange={handleChange}
          placeholder={placeholder}
          readOnly={readOnly}
          disabled={readOnly}
          className={`
            w-full h-full font-mono text-sm
            ${showLineNumbers ? 'pl-14' : 'px-3'}
            ${compact ? 'py-2' : 'py-3'}
            bg-transparent
            border-none
            focus:ring-2 focus:ring-blue-500 focus:outline-none
            rounded-lg
            resize-none
            ${readOnly ? 'text-slate-600' : 'text-slate-800'}
            ${hasError ? 'placeholder-red-300' : 'placeholder-slate-400'}
          `}
          spellCheck={false}
          style={{
            lineHeight: '1.5',
            tabSize: 2,
          }}
        />

        {/* Validation status icon */}
        {textValue.trim() && (
          <div className="absolute bottom-2 right-2">
            {isValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {hasError && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}

      {/* Help text */}
      {helpText && !hasError && (
        <p className="text-xs text-slate-500">{helpText}</p>
      )}

      {/* Expanded mode footer */}
      {isExpanded && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleExpand}
            leftIcon={Minimize2}
          >
            Collapse
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * JsonViewer Component
 * 
 * A read-only version of the JSON editor
 */
export function JsonViewer(props) {
  return <JsonEditor {...props} readOnly={true} allowUpload={false} />;
}

/**
 * JsonInput Component
 * 
 * A compact JSON input for forms
 */
export function JsonInput({ value, onChange, label, error, helpText, ...props }) {
  return (
    <JsonEditor
      value={value}
      onChange={onChange}
      label={label}
      error={error}
      helpText={helpText}
      compact={true}
      height={150}
      showLineNumbers={false}
      allowUpload={true}
      allowDownload={false}
      allowCopy={true}
      allowFormat={true}
      allowExpand={false}
      {...props}
    />
  );
}