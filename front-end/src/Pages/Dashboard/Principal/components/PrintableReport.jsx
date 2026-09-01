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
              margin: 10mm;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              height: auto;
              overflow: visible;
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
              font-family: "Times New Roman", serif;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <img
            src={apshahLogo}
            alt="AP Shah Institute Logo"
            style={{ width: '62px', height: '62px', objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.2 }}>
              PCT&apos;s A. P. Shah Institute of Technology
            </div>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>
              Department: {safeValue(departmentName)}
            </div>
          </div>
        </div>

        <h2 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 700, margin: '10px 0 18px 0' }}>
          {titleRange
            ? `NPTEL reimbursement details for ${titleRange}`
            : 'NPTEL reimbursement details'}
        </h2>

        <table
          className="principal-print-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            fontSize: '12px'
          }}
        >
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'center', width: '8%' }}>Sr. No</th>
              <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'center', width: '32%' }}>Applicant Name</th>
              <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'center', width: '30%' }}>Course Name</th>
              <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'center', width: '12%' }}>Marks</th>
              <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'center', width: '18%' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.srNo}>
                  <td style={{ border: '1px solid #000', padding: '7px 6px', textAlign: 'center', verticalAlign: 'top' }}>{row.srNo}</td>
                  <td style={{ border: '1px solid #000', padding: '7px 6px', textAlign: 'center', verticalAlign: 'top', wordBreak: 'break-word' }}>{row.applicantName}</td>
                  <td style={{ border: '1px solid #000', padding: '7px 6px', textAlign: 'center', verticalAlign: 'top', wordBreak: 'break-word' }}>{row.courseName}</td>
                  <td style={{ border: '1px solid #000', padding: '7px 6px', textAlign: 'center', verticalAlign: 'top' }}>{row.marks}</td>
                  <td style={{ border: '1px solid #000', padding: '7px 6px', textAlign: 'center', verticalAlign: 'top' }}>{row.amount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PrintableReport
