"use client"

export default function ApplyCard({ title, description, icon: Icon, avgAmount, color, onApplyClick }) {
  const colorClasses = {
    blue: "text-white",
    purple: "text-white", 
    green: "text-white",
    orange: "text-white",
    gray: "text-white",
  }

  return (
    <div className="rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col" style={{backgroundColor: 'white', border: '1px solid var(--color-light-teal)'}}>
      <div className="text-center flex-1 flex flex-col">
        {/* Icon - Responsive */}
        <div className={`inline-flex p-3 sm:p-4 rounded-lg ${colorClasses[color]} mb-3 sm:mb-4 mx-auto`} style={{backgroundColor: 'var(--color-medium-teal)'}}>
          <Icon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
        </div>

        {/* Title - Responsive */}
        <h3 className="text-base sm:text-lg font-semibold mb-2 leading-tight" style={{color: 'var(--color-dark-gray)'}}>
          {title}
        </h3>

        {/* Description - Responsive */}
        <p className="text-xs sm:text-sm mb-3 sm:mb-4 flex-1 leading-relaxed" style={{color: 'var(--color-dark-gray)'}}>
          {description}
        </p>

        {/* Average Amount - Responsive */}
        <p className="text-xs sm:text-sm mb-4 sm:mb-6" style={{color: 'var(--color-dark-gray)'}}>
          Avg: {avgAmount}
        </p>

        {/* Apply Button - Enhanced with better interactions */}
        <button
          onClick={onApplyClick}
          className="w-full text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium mt-auto text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm hover:shadow-md"
          style={{
            background: 'linear-gradient(135deg, var(--color-medium-teal) 0%, var(--color-light-teal) 50%, var(--color-dark-green) 100%)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, var(--color-dark-green) 0%, var(--color-medium-teal) 50%, var(--color-light-teal) 100%)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, var(--color-medium-teal) 0%, var(--color-light-teal) 50%, var(--color-dark-green) 100%)'
          }}
        >
          Apply Now
        </button>
      </div>
    </div>
  )
}
