import React, { useMemo } from 'react'
import apshahLogo from '../../../../assets/images/Apshah_logo.png'

const buildDateLabel = (start, end) => {
  if (!start || Number.isNaN(start.getTime())) return ''
  if (!end || Number.isNaN(end.getTime())) {
    return start.toLocaleString('en-US', { month: 'short', year: 'numeric' })
  }

  const startMonth = start.toLocaleString('en-US', { month: 'short' })
  const endMonth = end.toLocaleString('en-US', { month: 'short' })
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()

  if (startMonth === endMonth && startYear === endYear) {
    return `${startMonth} ${startYear}`
  }

  if (startYear === endYear) {
    return `${startMonth}-${endMonth} ${startYear}`
  }

  return `${startMonth} ${startYear}-${endMonth} ${endYear}`
}

const formatDateRangeLabel = (dateRange = {}, requests = []) => {
  const { startDate, endDate } = dateRange

  if (startDate && endDate) {
    return buildDateLabel(new Date(startDate), new Date(endDate))
  }

  if (startDate) {
    const start = new Date(startDate)
    return buildDateLabel(start, start)
  }

  if (endDate) {
    const end = new Date(endDate)
    return buildDateLabel(end, end)
  }

  const validDates = requests
    .map(request => new Date(request.submittedDate || request.createdAt || request.updatedAt))
    .filter(date => !Number.isNaN(date.getTime()))

  if (validDates.length === 0) return ''

  const sorted = [...validDates].sort((a, b) => a - b)
  return buildDateLabel(sorted[0], sorted[sorted.length - 1])
}

const formatAmount = (amount) => {
  if (amount === null || amount === undefined || amount === '') return '-'
  const cleaned = String(amount).replace(/[^\d.]/g, '')
  if (!cleaned) return '-'
  const parsed = Number.parseFloat(cleaned)
  if (!Number.isFinite(parsed)) return '-'
  return parsed.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const safeValue = (value) => {
  if (value === null || value === undefined) return '-'
  const text = String(value).trim()
  return text || '-'
}

const PrintableReport = ({ requests = [], dateRange = {}, departmentName = 'All Departments' }) => {
  const titleRange = useMemo(() => formatDateRangeLabel(dateRange, requests), [dateRange, requests])

  const totalSum = useMemo(() => {
    return requests.reduce((sum, r) => {
      const cleaned = String(r.amount || '0').replace(/[^\d.]/g, '')
      const parsed = parseFloat(cleaned) || 0
      return sum + parsed
    }, 0)
  }, [requests])

  const rows = useMemo(() => {
    return requests.map((request, index) => ({
      srNo: index + 1,
      applicantName: safeValue(request.applicantName || request.name),
      courseName: safeValue(request.courseName),
      marks: safeValue(request.marks),
      amount: formatAmount(request.amount)
    }))
  }, [requests])

  return (
    <div id="principal-print-section" className="principal-print-root">
      <style>
        {`
          @media screen {
            #principal-print-section {
              display: none;
            }
          }

          @media print {
            @page {
              size: A4;
              margin: 12mm 10mm;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              height: auto;
              overflow: visible;
              background: #fff !important;
            }

            body.principal-report-print * {
              visibility: hidden;
            }

            body.principal-report-print #principal-print-section,
            body.principal-report-print #principal-print-section * {
              visibility: visible;
            }

            body.principal-report-print .reports-screen,
            body.principal-report-print aside,
            body.principal-report-print nav,
            body.principal-report-print header,
            body.principal-report-print footer {
              display: none !important;
            }

            body.principal-report-print #principal-print-section {
              display: block;
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              color: #000;
              background: #fff;
              font-family: "Times New Roman", Times, serif;
            }

            .principal-print-container {
              width: 100%;
              box-sizing: border-box;
            }

            .principal-print-table {
              page-break-inside: auto;
            }

            .principal-print-table thead {
              display: table-header-group;
            }

            .principal-print-table tfoot {
              display: table-footer-group;
            }

            .principal-print-table tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .principal-print-table td,
            .principal-print-table th {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      <div className="principal-print-container">
        {/* Letterhead Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '14px' }}>
          <img
            src={apshahLogo}
            alt="AP Shah Institute Logo"
            style={{ width: '68px', height: '68px', objectFit: 'contain' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '19px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
              Parshvanath Charitable Trust&apos;s
            </div>
            <div style={{ fontSize: '21px', fontWeight: 900, color: '#000', lineHeight: 1.2 }}>
              A. P. SHAH INSTITUTE OF TECHNOLOGY
            </div>
            <div style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>
              Survey No. 12, Opp. Hypercity Mall, Kasarvadavali, Ghodbunder Road, Thane West, Maharashtra 400615
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px', color: '#111' }}>
              Department: {safeValue(departmentName)}
            </div>
          </div>
        </div>

        {/* Report Title */}
        <h2 style={{ textAlign: 'center', fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', margin: '14px 0 16px 0', textDecoration: 'underline' }}>
          {titleRange
            ? `NPTEL Reimbursement Sanction Statement (${titleRange})`
            : 'NPTEL Reimbursement Sanction Statement'}
        </h2>

        {/* Main Tabulated Data */}
        <table
          className="principal-print-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            fontSize: '11.5px'
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center', width: '8%', fontWeight: 700 }}>Sr. No</th>
              <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'left', width: '32%', fontWeight: 700 }}>Applicant Name</th>
              <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'left', width: '32%', fontWeight: 700 }}>Course / Expense Name</th>
              <th style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center', width: '10%', fontWeight: 700 }}>Score %</th>
              <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'right', width: '18%', fontWeight: 700 }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.srNo}>
                  <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', verticalAlign: 'top' }}>{row.srNo}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'left', verticalAlign: 'top', wordBreak: 'break-word' }}>{row.applicantName}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'left', verticalAlign: 'top', wordBreak: 'break-word' }}>{row.courseName}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', verticalAlign: 'top' }}>{row.marks}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right', verticalAlign: 'top' }}>{row.amount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ border: '1px solid #000', padding: '14px', textAlign: 'center' }}>
                  No reimbursement records found for the selected criteria.
                </td>
              </tr>
            )}
          </tbody>
          {/* Summary Footer */}
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: '#f8f8f8', fontWeight: 800 }}>
                <td colSpan={4} style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'right', textTransform: 'uppercase' }}>
                  Total Sanctioned Amount ({rows.length} Claim{rows.length > 1 ? 's' : ''}):
                </td>
                <td style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'right', fontSize: '12px' }}>
                  ₹{totalSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Formal Institutional Endorsement Block */}
        <div style={{ marginTop: '55px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '12px', fontWeight: 700 }}>
          <div style={{ textAlign: 'center', width: '28%' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '6px', height: '30px' }}></div>
            <div>Prepared / Verified By</div>
            <div style={{ fontSize: '10px', fontWeight: 400, color: '#555' }}>Coordinator / Committee</div>
          </div>
          <div style={{ textAlign: 'center', width: '28%' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '6px', height: '30px' }}></div>
            <div>Head of Department</div>
            <div style={{ fontSize: '10px', fontWeight: 400, color: '#555' }}>Signature & Stamp</div>
          </div>
          <div style={{ textAlign: 'center', width: '28%' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '6px', height: '30px' }}></div>
            <div>Principal Sanction</div>
            <div style={{ fontSize: '10px', fontWeight: 400, color: '#555' }}>A. P. Shah Institute of Technology</div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default PrintableReport
