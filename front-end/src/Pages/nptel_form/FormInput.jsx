import React from 'react';

const FormInput = ({
  label,
  id,
  name,
  type = "text",
  value,
  onChange,
  error,
  isViewMode,
  placeholder,
  required = true
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && "*"}
    </label>
    <input
      type={type}
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      required={!isViewMode && required}
      readOnly={isViewMode}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border rounded-md focus:outline-none ${
        isViewMode
          ? 'bg-gray-50 border-gray-300 text-gray-500'
          : `focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`
      }`}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export default FormInput;