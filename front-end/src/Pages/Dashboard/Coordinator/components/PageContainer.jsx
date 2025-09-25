import React from "react";

export default function PageContainer({ children }) {
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 lg:py-10">
      {children}
    </div>
  );
}
